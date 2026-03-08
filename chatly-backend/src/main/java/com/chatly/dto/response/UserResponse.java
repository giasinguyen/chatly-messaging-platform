package com.chatly.dto.response;

import com.chatly.model.enums.UserStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private String id;
    private String username;
    private String email;
    private String displayName;
    private String avatarUrl;
    private String phone;
    private Instant dob;
    private String bio;
    private UserStatus status;
    private Instant lastSeen;
    private Instant createdAt;
}
