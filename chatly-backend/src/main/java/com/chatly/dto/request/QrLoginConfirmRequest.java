package com.chatly.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class QrLoginConfirmRequest {
    @NotBlank(message = "QR Token is required")
    private String token;
}
