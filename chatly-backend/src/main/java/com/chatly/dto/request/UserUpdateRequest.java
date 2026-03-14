package com.chatly.dto.request;

import tools.jackson.databind.annotation.JsonDeserialize;
import lombok.*;

import java.time.Instant;

import com.chatly.config.CustomInstantDeserializer;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateRequest {

    private String username;
    private String email;
    private String phone;
    private String displayName;
    private String avatarUrl;

    @JsonDeserialize(using = CustomInstantDeserializer.class)
    private Instant dob;

    private String bio;
}
