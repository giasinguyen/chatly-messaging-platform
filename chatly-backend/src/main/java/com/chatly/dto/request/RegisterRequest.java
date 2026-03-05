package com.chatly.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "INVALID_KEY")
    @Email(message = "INVALID_KEY")
    private String email;

    @NotBlank(message = "INVALID_KEY")
    @Size(min = 6, message = "PASSWORD_TOO_SHORT")
    private String password;

    @NotBlank(message = "INVALID_KEY")
    private String displayName;
}
