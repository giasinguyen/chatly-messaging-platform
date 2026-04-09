package com.chatly.agent;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AgentFileResponse(
        String id,
        @JsonProperty("session_id") String sessionId,
        @JsonProperty("user_id") String userId,
        String filename,
        @JsonProperty("mime_type") String mimeType,
        @JsonProperty("size_bytes") long sizeBytes,
        @JsonProperty("object_key") String objectKey,
        @JsonProperty("created_at") String createdAt
) {
}
