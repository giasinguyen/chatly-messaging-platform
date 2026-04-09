package com.chatly.agent;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AgentMcpServerUpdateRequest(
        @JsonProperty("is_active") boolean isActive
) {
}
