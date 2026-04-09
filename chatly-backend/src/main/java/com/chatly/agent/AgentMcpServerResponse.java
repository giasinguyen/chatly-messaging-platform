package com.chatly.agent;

import com.chatly.config.CustomInstantDeserializer;
import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.annotation.JsonDeserialize;

import java.time.Instant;
import java.util.Map;

public record AgentMcpServerResponse(
        String id,
        @JsonProperty("user_id") String userId,
        String name,
        String url,
        Map<String, String> headers,
        @JsonProperty("is_active") boolean isActive,
        @JsonProperty("created_at") @JsonDeserialize(using = CustomInstantDeserializer.class) Instant createdAt,
        @JsonProperty("updated_at") @JsonDeserialize(using = CustomInstantDeserializer.class) Instant updatedAt
) {
}
