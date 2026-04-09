package com.chatly.agent;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AgentChatResponse(
        String content,
        @JsonProperty("session_id") String sessionId,
        @JsonProperty("message_id") String messageId
) {
}
