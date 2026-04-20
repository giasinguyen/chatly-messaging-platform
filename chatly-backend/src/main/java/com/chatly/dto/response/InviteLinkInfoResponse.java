package com.chatly.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InviteLinkInfoResponse {
    private String conversationId;
    private String name;
    private String avatarUrl;
    private int memberCount;
    private boolean requireApproval;
    private boolean isAlreadyMember;
    private boolean hasPendingRequest;
}
