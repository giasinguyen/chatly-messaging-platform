package com.chatly.agent;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AgentChatRequest(
        @JsonProperty("session_id") String sessionId,
        String message,
        @JsonProperty("agent_type") String agentType,
        @JsonProperty("use_web_search") boolean useWebSearch,
        @JsonProperty("mcp_server_ids") List<String> mcpServerIds
) {
}
