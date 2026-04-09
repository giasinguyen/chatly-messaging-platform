package com.chatly.agent;

import com.chatly.config.CustomInstantDeserializer;
import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.annotation.JsonDeserialize;

import java.time.Instant;
import java.util.Map;

public record AgentMessageResponse(
        String id,
        @JsonProperty("session_id") String sessionId,
        String role,
        String content,
        @JsonProperty("tool_calls") Map<String, Object> toolCalls,
        @JsonProperty("created_at") @JsonDeserialize(using = CustomInstantDeserializer.class) Instant createdAt
) {
}
