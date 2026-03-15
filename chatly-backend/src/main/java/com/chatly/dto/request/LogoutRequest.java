package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogoutRequest {

    @NotBlank(message = "INVALID_KEY")
    private String token;

    private String refreshToken; // Optional: also blacklist refresh token
}
