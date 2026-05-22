package com.chatly.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLogResponse {

    private String id;
    private String adminUserId;
    private String type;
    private String targetType;
    private String targetId;
    private String title;
    private String description;
    private Instant createdAt;
}
