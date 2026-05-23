package com.chatly.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InviteLinkResponse {

    private String inviteToken;
    private String inviteLink;
}
