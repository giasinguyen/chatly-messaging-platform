package com.chatly.dto.request;

import com.chatly.configuration.CustomInstantDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @Email(message = "INVALID_EMAIL")
    private String email;

    private String phone;

    @NotBlank(message = "INVALID_KEY")
    private String displayName;

    @NotBlank(message = "INVALID_KEY")
    private String username;

    @NotBlank(message = "INVALID_KEY")
    @Size(min = 6, message = "PASSWORD_TOO_SHORT")
    private String password;

    @JsonDeserialize(using = CustomInstantDeserializer.class)
    private Instant dob;
}
