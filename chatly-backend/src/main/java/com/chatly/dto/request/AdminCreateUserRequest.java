package com.chatly.dto.request;

import com.chatly.config.CustomInstantDeserializer;
import com.chatly.constant.ValidationPatternConstants;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
public class AdminCreateUserRequest {

    @NotBlank(message = "INVALID_KEY")
    @Pattern(regexp = ValidationPatternConstants.USERNAME_REGEX, message = "INVALID_USERNAME_FORMAT")
    private String username;

    @Email(message = "INVALID_EMAIL")
    private String email;

    private String phone;

    @NotBlank(message = "INVALID_KEY")
    @Pattern(regexp = ValidationPatternConstants.DISPLAY_NAME_REGEX, message = "INVALID_DISPLAY_NAME_FORMAT")
    private String displayName;

    @NotBlank(message = "INVALID_KEY")
    @Size(min = 6, message = "PASSWORD_TOO_SHORT")
    private String password;

    private String avatarUrl;

    private String bio;

    @JsonDeserialize(using = CustomInstantDeserializer.class)
    private Instant dob;
}
