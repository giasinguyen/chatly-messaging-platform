package com.chatly.agent;

import java.util.List;

public record AgentFileListResponse(
        List<AgentFileResponse> files,
        int total
) {
}
