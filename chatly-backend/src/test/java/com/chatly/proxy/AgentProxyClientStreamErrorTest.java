package com.chatly.proxy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests that {@link AgentProxyClient#forwardStream} converts proxy-level failures
 * (timeout, upstream 429, upstream 5xx) into a structured SSE error item instead
 * of terminating the Flux with an exception.
 */
class AgentProxyClientStreamErrorTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private MockWebServer server;
    private AgentProxyClient client;

    @BeforeEach
    void setUp() throws IOException {
        server = new MockWebServer();
        server.start();
        String baseUrl = server.url("/").toString().replaceAll("/$", "");
        client = new AgentProxyClient(baseUrl, "test-key", 5, 2);
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private JsonNode parseErrorPayload(String sseItem) throws Exception {
        // sseItem arrives as raw JSON (the data portion of the SSE frame)
        return OBJECT_MAPPER.readTree(sseItem);
    }

    // ─── tests ────────────────────────────────────────────────────────────────

    @Test
    void forwardStream_whenUpstream429_emitsRateLimitErrorItem() throws Exception {
        server.enqueue(new MockResponse()
                .setResponseCode(429)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody("{\"message\": \"Too Many Requests\"}"));

        Flux<String> flux = client.forwardStream(
                "/sessions/s1/chat/stream", "user-1", "{}".getBytes());

        StepVerifier.create(flux)
                .assertNext(item -> {
                    try {
                        JsonNode root = parseErrorPayload(item);
                        assertThat(root.path("type").asText()).isEqualTo("error");
                        JsonNode data = root.path("data");
                        assertThat(data.path("code").asText()).isEqualTo("PROXY_RATE_LIMITED");
                        assertThat(data.path("category").asText()).isEqualTo("rate_limit");
                        assertThat(data.path("retryable").asBoolean()).isTrue();
                    } catch (Exception e) {
                        throw new AssertionError("Failed to parse SSE error payload", e);
                    }
                })
                .verifyComplete();
    }

    @Test
    void forwardStream_whenUpstream503_emitsProviderErrorItem() throws Exception {
        server.enqueue(new MockResponse()
                .setResponseCode(503)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody("{\"message\": \"Service Unavailable\"}"));

        Flux<String> flux = client.forwardStream(
                "/sessions/s1/chat/stream", "user-1", "{}".getBytes());

        StepVerifier.create(flux)
                .assertNext(item -> {
                    try {
                        JsonNode root = parseErrorPayload(item);
                        assertThat(root.path("type").asText()).isEqualTo("error");
                        JsonNode data = root.path("data");
                        assertThat(data.path("code").asText()).isEqualTo("PROXY_UPSTREAM_ERROR");
                        assertThat(data.path("category").asText()).isEqualTo("provider_error");
                        assertThat(data.path("retryable").asBoolean()).isTrue();
                    } catch (Exception e) {
                        throw new AssertionError("Failed to parse SSE error payload", e);
                    }
                })
                .verifyComplete();
    }

    @Test
    void forwardStream_whenUpstream400_emitsValidationErrorItem() throws Exception {
        server.enqueue(new MockResponse()
                .setResponseCode(400)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody("{\"message\": \"Bad Request\"}"));

        Flux<String> flux = client.forwardStream(
                "/sessions/s1/chat/stream", "user-1", "{}".getBytes());

        StepVerifier.create(flux)
                .assertNext(item -> {
                    try {
                        JsonNode root = parseErrorPayload(item);
                        assertThat(root.path("type").asText()).isEqualTo("error");
                        JsonNode data = root.path("data");
                        assertThat(data.path("code").asText()).isEqualTo("PROXY_BAD_REQUEST");
                        assertThat(data.path("category").asText()).isEqualTo("validation_error");
                        assertThat(data.path("retryable").asBoolean()).isFalse();
                    } catch (Exception e) {
                        throw new AssertionError("Failed to parse SSE error payload", e);
                    }
                })
                .verifyComplete();
    }

    @Test
    void forwardStream_whenStreamTimeoutExceeded_emitsTimeoutErrorItem() {
        // Delay response beyond the 2-second stream timeout
        server.enqueue(new MockResponse()
                .setBodyDelay(5, TimeUnit.SECONDS)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_EVENT_STREAM_VALUE)
                .setBody("data: {\"type\": \"token\", \"data\": {\"content\": \"hi\"}}\n\n"));

        Flux<String> flux = client.forwardStream(
                "/sessions/s1/chat/stream", "user-1", "{}".getBytes());

        StepVerifier.create(flux)
                .assertNext(item -> {
                    try {
                        JsonNode root = parseErrorPayload(item);
                        assertThat(root.path("type").asText()).isEqualTo("error");
                        JsonNode data = root.path("data");
                        assertThat(data.path("code").asText()).isEqualTo("PROXY_TIMEOUT");
                        assertThat(data.path("category").asText()).isEqualTo("timeout");
                        assertThat(data.path("retryable").asBoolean()).isTrue();
                    } catch (Exception e) {
                        throw new AssertionError("Failed to parse SSE error payload", e);
                    }
                })
                .verifyComplete();
    }

    @Test
    void forwardStream_whenUpstreamSucceeds_forwardsTokensAndCompletes() {
        String sseBody =
                "data: {\"type\": \"token\", \"data\": {\"content\": \"Hello\"}}\n\n"
                + "data: {\"type\": \"done\", \"data\": {\"message_id\": \"m1\"}}\n\n";

        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_EVENT_STREAM_VALUE)
                .setBody(sseBody));

        Flux<String> flux = client.forwardStream(
                "/sessions/s1/chat/stream", "user-1", "{}".getBytes());

        StepVerifier.create(flux)
                .expectNextMatches(item -> item.contains("token"))
                .expectNextMatches(item -> item.contains("done"))
                .verifyComplete();
    }
}
