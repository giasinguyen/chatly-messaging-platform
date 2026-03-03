package com.chatly.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateRequest {

    private String displayName;
    private String avatarUrl;
    private String phone;
    private String bio;
}
