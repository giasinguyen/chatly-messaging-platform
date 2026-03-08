package com.chatly.dto.request;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateRequest {

    private String username;
    private String displayName;
    private String avatarUrl;
    private String phone;
    private Instant dob;
    private String bio;
}
