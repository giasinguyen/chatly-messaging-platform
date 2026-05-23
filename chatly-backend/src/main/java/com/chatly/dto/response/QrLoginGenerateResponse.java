package com.chatly.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class QrLoginGenerateResponse {
    private String token;
    private Instant expiresAt;
}
