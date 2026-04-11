package com.chatly.dto.response;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingJoinResponse {

    private String id;
    private String conversationId;
    private String userId;
    private String displayName;
    private String username;
    private String avatarUrl;
    private String invitedBy;
    private Instant createdAt;
}
