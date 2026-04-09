package com.chatly.agent;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

@Component
@Slf4j
public class AgentClient {

    private final WebClient webClient;
    private final int timeoutSeconds;
    private final int streamTimeoutSeconds;

    public AgentClient(
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
        log.info("AgentClient initialized — base-url={}", baseUrl);
    }

    /**
     * Blocking chat — returns full response once the LLM finishes.
     */
    public AgentChatResponse chat(AgentChatRequest request, String userId, String userRole) {
        return webClient.post()
                .uri("/sessions/{id}/chat", request.sessionId())
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentChatResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    /**
     * SSE streaming — returns a Flux of raw SSE lines to pipe straight back to
     * the browser via {@code MediaType.TEXT_EVENT_STREAM_VALUE}.
     */
    public Flux<String> stream(AgentChatRequest request, String userId, String userRole) {
        return webClient.post()
                .uri("/sessions/{id}/chat/stream", request.sessionId())
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToFlux(String.class)
                .timeout(Duration.ofSeconds(streamTimeoutSeconds));
    }

    /**
     * Multipart file forward — reads the file into memory once then sends it
     * to the agent. Uses {@link ByteArrayResource} with a filename override to
     * avoid the stream-twice issue with raw {@link MultipartFile}.
     */
    public AgentFileResponse uploadFile(
            String sessionId, MultipartFile file, String userId, String userRole
    ) throws IOException {
        byte[] bytes = file.getBytes();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
        String contentType = file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

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
                .uri("/sessions/{id}/files", sessionId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .bodyValue(builder.build())
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentFileResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    private Mono<? extends Throwable> handleError(ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("<empty body>")
                .map(body -> {
                    log.error("Agent returned error {}: {}", response.statusCode().value(), body);
                    return new AgentServiceException(response.statusCode(), body);
                });
    }

    // ── Sessions ──────────────────────────────────────────────────────────────

    public AgentSessionResponse createSession(
            AgentSessionRequest request, String userId, String userRole
    ) {
        return webClient.post()
                .uri("/sessions")
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentSessionResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    public AgentSessionListResponse listSessions(String userId, String userRole) {
        return webClient.get()
                .uri("/sessions")
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentSessionListResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    public AgentSessionResponse getSession(
            String sessionId, String userId, String userRole
    ) {
        return webClient.get()
                .uri("/sessions/{id}", sessionId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentSessionResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    public void deleteSession(String sessionId, String userId, String userRole) {
        webClient.delete()
                .uri("/sessions/{id}", sessionId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    public AgentMessageHistoryResponse getHistory(
            String sessionId, String userId, String userRole
    ) {
        return webClient.get()
                .uri("/sessions/{id}/messages", sessionId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentMessageHistoryResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    // ── Files ─────────────────────────────────────────────────────────────────

    public AgentFileListResponse listFiles(
            String sessionId, String userId, String userRole
    ) {
        return webClient.get()
                .uri("/sessions/{id}/files", sessionId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentFileListResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    public void deleteFile(
            String sessionId, String fileId, String userId, String userRole
    ) {
        webClient.delete()
                .uri("/sessions/{sid}/files/{fid}", sessionId, fileId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    // ── MCP Servers ───────────────────────────────────────────────────────────

    public AgentMcpServerResponse registerMcpServer(
            AgentMcpServerRequest request, String userId, String userRole
    ) {
        return webClient.post()
                .uri("/mcp/servers")
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentMcpServerResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    public List<AgentMcpServerResponse> listMcpServers(String userId, String userRole) {
        return webClient.get()
                .uri("/mcp/servers")
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToFlux(AgentMcpServerResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .collectList()
                .block();
    }

    public AgentMcpServerResponse getMcpServer(
            String serverId, String userId, String userRole
    ) {
        return webClient.get()
                .uri("/mcp/servers/{id}", serverId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentMcpServerResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    public AgentMcpServerResponse updateMcpServer(
            String serverId, AgentMcpServerUpdateRequest request, String userId, String userRole
    ) {
        return webClient.patch()
                .uri("/mcp/servers/{id}", serverId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(AgentMcpServerResponse.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }

    public void deleteMcpServer(String serverId, String userId, String userRole) {
        webClient.delete()
                .uri("/mcp/servers/{id}", serverId)
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole)
                .retrieve()
                .onStatus(status -> status.isError(), this::handleError)
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();
    }
}
