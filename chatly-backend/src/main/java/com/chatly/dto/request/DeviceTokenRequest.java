package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeviceTokenRequest {
    @NotBlank(message = "Token cannot be blank")
    private String token;
}
