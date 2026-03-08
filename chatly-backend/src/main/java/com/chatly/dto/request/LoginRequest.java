package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequest {

    @NotBlank(message = "INVALID_KEY")
    private String identifier;

    @NotBlank(message = "INVALID_KEY")
    private String password;
}
