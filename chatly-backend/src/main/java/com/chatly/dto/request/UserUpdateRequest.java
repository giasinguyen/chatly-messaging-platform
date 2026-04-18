package com.chatly.dto.request;

import tools.jackson.databind.annotation.JsonDeserialize;
import com.chatly.constant.ValidationPatternConstants;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.time.Instant;

import com.chatly.config.CustomInstantDeserializer;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateRequest {

    @Pattern(regexp = ValidationPatternConstants.USERNAME_REGEX, message = "INVALID_USERNAME_FORMAT")
    private String username;
    private String email;
    private String phone;
    @Pattern(regexp = ValidationPatternConstants.DISPLAY_NAME_REGEX, message = "INVALID_DISPLAY_NAME_FORMAT")
    private String displayName;
    private String avatarUrl;

    @JsonDeserialize(using = CustomInstantDeserializer.class)
    private Instant dob;

    private String bio;
}
