package com.chatly.controller;

import com.chatly.dto.request.StartChatFromPostRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.StartChatFromPostResponse;
import com.chatly.proxy.AgentProxyClient;
import com.chatly.service.PostService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

/**
 * Provides the "Chat with AI about this post" entry point for the social feed.
 *
 * Creates (or reuses) an agent session bound to a specific post and returns
 * the session ID so the frontend can navigate directly into the chatbot.
 */
@RestController
@RequestMapping("/api/ai/social")
@RequiredArgsConstructor
@Slf4j
public class AgentSocialSessionController {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final int POST_SNIPPET_MAX_LENGTH = 80;
    private static final String SOCIAL_CONTEXT_CONVERSATION_PREFIX = "social:post:";

    private final PostService postService;
    private final AgentProxyClient agentProxy;

    @PostMapping("/start-from-post")
    ApiResponse<StartChatFromPostResponse> startFromPost(
            @RequestBody @Valid StartChatFromPostRequest request,
            @AuthenticationPrincipal String userId
    ) {
        String postContext = postService.buildPostContextForAi(request.getPostId());
        String postSnippet = postContext.length() > POST_SNIPPET_MAX_LENGTH
                ? postContext.substring(0, POST_SNIPPET_MAX_LENGTH) + "…"
                : postContext;

        String sessionTitle = "Chatly AI · " + postSnippet;
        String contextConversationId = SOCIAL_CONTEXT_CONVERSATION_PREFIX + request.getPostId();

        byte[] bodyBytes = buildSessionBody(sessionTitle, contextConversationId);
        ResponseEntity<byte[]> agentResponse = agentProxy.forward(HttpMethod.POST, "/sessions", userId, bodyBytes);

        String sessionId = extractSessionId(agentResponse.getBody(), request.getPostId());
        log.info("Social AI chat session created: postId={} sessionId={} userId={}", request.getPostId(), sessionId, userId);

        return ApiResponse.<StartChatFromPostResponse>builder()
                .result(StartChatFromPostResponse.builder()
                        .sessionId(sessionId)
                        .title(sessionTitle)
                        .postSnippet(postSnippet)
                        .build())
                .build();
    }

    private byte[] buildSessionBody(String title, String contextConversationId) {
        try {
            return OBJECT_MAPPER.writeValueAsBytes(Map.of(
                    "title", title,
                    "context_conversation_id", contextConversationId
            ));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize session creation payload", ex);
        }
    }

    private String extractSessionId(byte[] responseBody, String postId) {
        if (responseBody == null || responseBody.length == 0) {
            throw new IllegalStateException("Empty response from agent when creating session for post=" + postId);
        }
        try {
            JsonNode node = OBJECT_MAPPER.readTree(responseBody);
            JsonNode idNode = node.get("id");
            if (idNode == null || idNode.isNull()) {
                throw new IllegalStateException("Agent session response missing 'id' field for post=" + postId);
            }
            return idNode.asText();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to parse agent session response for post=" + postId, ex);
        }
    }
}
