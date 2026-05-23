package com.chatly.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;
    private String refreshToken;
    /** Server session id (JWT jti); use for “current device” in session list */
    private String sessionId;
    private UserResponse user;
}
