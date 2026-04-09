package com.chatly.agent;

import java.util.List;

public record AgentSessionListResponse(
        List<AgentSessionResponse> sessions,
        int total
) {
}
