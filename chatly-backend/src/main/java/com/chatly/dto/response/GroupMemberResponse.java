package com.chatly.dto.response;

import com.chatly.model.enums.GroupRole;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMemberResponse {

    private String userId;
    private String username;
    private String displayName;
    private String avatar;
    private GroupRole role;
    private Instant joinedAt;
}
