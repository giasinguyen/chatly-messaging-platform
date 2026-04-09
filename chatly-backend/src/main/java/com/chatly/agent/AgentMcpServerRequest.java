package com.chatly.agent;

import java.util.Map;

public record AgentMcpServerRequest(
        String name,
        String url,
        Map<String, String> headers
) {
}
