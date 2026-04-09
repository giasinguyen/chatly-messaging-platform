package com.chatly.agent;

import java.util.List;

public record AgentMessageHistoryResponse(
        List<AgentMessageResponse> messages
) {
}
