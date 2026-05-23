package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangePasswordRequest {

    @NotBlank(message = "INVALID_KEY")
    private String currentPassword;

    @NotBlank(message = "INVALID_KEY")
    @Size(min = 6, message = "PASSWORD_TOO_SHORT")
    private String newPassword;

    @NotBlank(message = "INVALID_KEY")
    private String confirmPassword;
}
