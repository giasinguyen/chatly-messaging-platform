package com.chatly.proxy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeoutException;

@Component
@Slf4j
public class AgentProxyClient {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final WebClient webClient;
    private final int timeoutSeconds;
    private final int streamTimeoutSeconds;

    public AgentProxyClient(
            @Value("${agent.base-url}") String baseUrl,
            @Value("${agent.api-key}") String apiKey,
            @Value("${agent.timeout-seconds:60}") int timeoutSeconds,
            @Value("${agent.stream-timeout-seconds:120}") int streamTimeoutSeconds
    ) {
        this.timeoutSeconds = timeoutSeconds;
        this.streamTimeoutSeconds = streamTimeoutSeconds;
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-API-Key", apiKey)
                .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
        log.info("AgentProxyClient initialized — base-url={}", baseUrl);
    }

    /**
     * Forward JSON request/response (non-SSE, non-multipart).
     * Pass {@code null} body for GET/DELETE requests.
     */
    public ResponseEntity<byte[]> forward(
            HttpMethod method,
            String agentPath,
            String userId,
            byte[] body
    ) {
        WebClient.RequestBodySpec spec = webClient.method(method)
                .uri(agentPath)
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON);

        WebClient.RequestHeadersSpec<?> headersSpec = (body != null && body.length > 0)
                ? spec.bodyValue(body)
                : spec;

        return headersSpec
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleAgentError)
                .toEntity(byte[].class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    /**
     * Forward multipart — reads file into memory and forwards to agent.
     */
    public ResponseEntity<byte[]> forwardMultipart(
            String agentPath,
            String userId,
            MultipartFile file
    ) throws IOException {
        byte[] bytes = file.getBytes();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
        String contentType = file.getContentType() != null
                ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        ByteArrayResource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", resource)
                .filename(filename)
                .contentType(MediaType.parseMediaType(contentType));

        return webClient.post()
                .uri(agentPath)
                .header("X-User-Id", userId)
                .bodyValue(builder.build())
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleAgentError)
                .toEntity(byte[].class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    /**
     * Forward SSE stream — returns a {@code Flux<String>} to pipe via {@link
     * org.springframework.web.servlet.mvc.method.annotation.SseEmitter}.
     * Each element is the data payload of one SSE event.
     */
    public Flux<String> forwardStream(
            String agentPath,
            String userId,
            byte[] body
    ) {
        return webClient.post()
                .uri(agentPath)
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleAgentError)
                .bodyToFlux(String.class)
                .timeout(Duration.ofSeconds(streamTimeoutSeconds))
                .onErrorResume(e -> Flux.just(buildStreamErrorPayload(e)));
    }

    /** Expose stream timeout in milliseconds for {@code SseEmitter} timeout. */
    public long streamTimeoutMs() {
        return streamTimeoutSeconds * 1000L;
    }

    /**
     * Forward a binary download — preserves Content-Type and Content-Disposition
     * from the upstream agent response so browsers receive correct headers.
     */
    public ResponseEntity<byte[]> forwardBinary(
            String agentPath,
            String userId
    ) {
        return webClient.get()
                .uri(agentPath)
                .header("X-User-Id", userId)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleAgentError)
                .toEntity(byte[].class)
                .map(entity -> {
                    var headers = new org.springframework.http.HttpHeaders();
                    var contentType = entity.getHeaders().getContentType();
                    if (contentType != null) {
                        headers.setContentType(contentType);
                    }
                    var disposition = entity.getHeaders().getFirst("Content-Disposition");
                    if (disposition != null) {
                        headers.set("Content-Disposition", disposition);
                    }
                    headers.setCacheControl("private, max-age=3600");
                    return new ResponseEntity<>(entity.getBody(), headers, entity.getStatusCode());
                })
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    /**
     * Fire-and-forget POST to the agent's {@code /internal/assist} endpoint.
     * Returns immediately; any error is logged and suppressed.
     */
    public void triggerAssistAsync(String conversationId, String userId, String content) {
        Map<String, String> payload = Map.of(
                "user_id", userId,
                "conversation_id", conversationId,
                "content", content
        );
        byte[] bodyBytes;
        try {
            bodyBytes = OBJECT_MAPPER.writeValueAsBytes(payload);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize AI assist request: {}", ex.getMessage());
            return;
        }
        webClient.post()
                .uri("/internal/assist")
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(bodyBytes)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleAgentError)
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .subscribe(
                        null,
                        ex -> log.warn("AI assist trigger failed conversation={}: {}", conversationId, ex.getMessage())
                );
    }

    /**
     * Fire-and-forget POST to {@code /internal/briefing} for one user.
     * Returns immediately; errors are logged and suppressed.
     */
    public void triggerBriefingAsync(String userId) {
        Map<String, String> payload = Map.of("user_id", userId);
        byte[] bodyBytes;
        try {
            bodyBytes = OBJECT_MAPPER.writeValueAsBytes(payload);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize briefing request for user={}: {}", userId, ex.getMessage());
            return;
        }
        webClient.post()
                .uri("/internal/briefing")
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(bodyBytes)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleAgentError)
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .subscribe(
                        null,
                        ex -> log.warn("Briefing trigger failed user={}: {}", userId, ex.getMessage())
                );
    }

    public void triggerFileIndexAsync(
            String conversationId,
            String fileId,
            String fileUrl,
            String filename,
            String mimeType,
            String uploadedBy) {
        Map<String, String> payload = Map.of(
                "conversation_id", conversationId,
                "file_id", fileId,
                "file_url", fileUrl,
                "filename", filename,
                "mime_type", mimeType,
                "uploaded_by", uploadedBy
        );
        byte[] bodyBytes;
        try {
            bodyBytes = OBJECT_MAPPER.writeValueAsBytes(payload);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize index-file request conversation={}: {}", conversationId, ex.getMessage());
            return;
        }
        webClient.post()
                .uri("/internal/index-file")
                .header("X-User-Id", uploadedBy)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(bodyBytes)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleAgentError)
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .subscribe(
                        null,
                        ex -> log.warn("File index trigger failed conversation={} file={}: {}",
                                conversationId, fileId, ex.getMessage())
                );
    }

    public void triggerSocialMentionCommentAsync(
            String postId,
            String commentId,
            String userId,
            String content,
            String postContext,
            String threadContext) {
        Map<String, String> payload = Map.of(
                "post_id", postId,
                "comment_id", commentId,
                "user_id", userId,
                "content", content,
                "post_context", postContext != null ? postContext : "",
                "thread_context", threadContext != null ? threadContext : ""
        );
        byte[] bodyBytes;
        try {
            bodyBytes = OBJECT_MAPPER.writeValueAsBytes(payload);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize social mention comment request postId={}: {}", postId, ex.getMessage());
            return;
        }
        webClient.post()
                .uri("/internal/social/mention-comment")
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(bodyBytes)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleAgentError)
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .subscribe(
                        null,
                        ex -> log.warn("Social mention comment trigger failed postId={} commentId={}: {}",
                                postId, commentId, ex.getMessage())
                );
    }

                        public void triggerSocialPostCommandAsync(
                            String postId,
                            String userId,
                            String commandContent,
                            String postContext,
                            String threadContext) {
                        Map<String, String> payload = Map.of(
                            "post_id", postId,
                            "user_id", userId,
                            "command_content", commandContent,
                            "post_context", postContext != null ? postContext : "",
                            "thread_context", threadContext != null ? threadContext : ""
                        );
                        byte[] bodyBytes;
                        try {
                            bodyBytes = OBJECT_MAPPER.writeValueAsBytes(payload);
                        } catch (JsonProcessingException ex) {
                            log.warn("Failed to serialize social post command request postId={}: {}", postId, ex.getMessage());
                            return;
                        }
                        webClient.post()
                            .uri("/internal/social/post-command")
                            .header("X-User-Id", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(bodyBytes)
                            .retrieve()
                            .onStatus(HttpStatusCode::isError, this::handleAgentError)
                            .bodyToMono(Void.class)
                            .timeout(Duration.ofSeconds(timeoutSeconds))
                            .subscribe(
                                null,
                                ex -> log.warn("Social post command trigger failed postId={}: {}", postId, ex.getMessage())
                            );
                        }

    private String buildStreamErrorPayload(Throwable e) {
        final String message;
        final String code;
        final String category;
        final boolean retryable;

        if (e instanceof TimeoutException) {
            message = "The AI service did not respond in time. Please try again.";
            code = "PROXY_TIMEOUT";
            category = "timeout";
            retryable = true;
        } else if (e instanceof AgentProxyException ape) {
            int status = ape.getAgentStatusCode().value();
            if (status == 429) {
                message = "AI service is busy. Please wait a moment and try again.";
                code = "PROXY_RATE_LIMITED";
                category = "rate_limit";
                retryable = true;
            } else if (status >= 500) {
                message = "AI service is temporarily unavailable.";
                code = "PROXY_UPSTREAM_ERROR";
                category = "provider_error";
                retryable = true;
            } else {
                message = "Invalid request to AI service.";
                code = "PROXY_BAD_REQUEST";
                category = "validation_error";
                retryable = false;
            }
        } else {
            message = "An unexpected error occurred in the AI service.";
            code = "PROXY_INTERNAL_ERROR";
            category = "internal";
            retryable = false;
        }

        log.error("Stream proxy error — code={} category={}: {}", code, category, e.getMessage());

        ObjectNode data = OBJECT_MAPPER.createObjectNode()
                .put("message", message)
                .put("code", code)
                .put("category", category)
                .put("retryable", retryable);
        ObjectNode root = OBJECT_MAPPER.createObjectNode();
        root.put("type", "error");
        root.set("data", data);
        return root.toString();
    }

    private Mono<? extends Throwable> handleAgentError(ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("<empty body>")
                .map(body -> {
                    log.error("Agent error {}: {}", response.statusCode().value(), body);
                    return new AgentProxyException(response.statusCode(), body);
                });
    }
}
