package com.chatly.agent;

import com.chatly.config.CustomInstantDeserializer;
import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.annotation.JsonDeserialize;

import java.time.Instant;

public record AgentSessionResponse(
        String id,
        @JsonProperty("user_id") String userId,
        String title,
        @JsonProperty("created_at") @JsonDeserialize(using = CustomInstantDeserializer.class) Instant createdAt,
        @JsonProperty("updated_at") @JsonDeserialize(using = CustomInstantDeserializer.class) Instant updatedAt
) {
}
