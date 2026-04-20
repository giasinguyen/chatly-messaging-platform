package com.chatly.proxy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
                .timeout(Duration.ofSeconds(streamTimeoutSeconds));
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

    private Mono<? extends Throwable> handleAgentError(ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("<empty body>")
                .map(body -> {
                    log.error("Agent error {}: {}", response.statusCode().value(), body);
                    return new AgentProxyException(response.statusCode(), body);
                });
    }
}
