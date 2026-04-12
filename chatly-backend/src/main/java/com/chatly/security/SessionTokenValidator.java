package com.chatly.security;

import com.chatly.model.postgres.UserLoginSession;
import com.chatly.repository.postgres.UserLoginSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.UUID;

/**
 * Validates JWT session id (jti) against {@link com.chatly.model.postgres.UserLoginSession}.
 * Tokens without jti are treated as legacy and pass this check.
 */
@Component
@RequiredArgsConstructor
public class SessionTokenValidator {

    private final JwtProvider jwtProvider;
    private final UserLoginSessionRepository userLoginSessionRepository;

    public boolean isSessionTokenAcceptable(String token) {
        if (!jwtProvider.validateToken(token)) {
            return false;
        }
        String jti = jwtProvider.getSessionIdFromToken(token);
        if (!StringUtils.hasText(jti)) {
            return true;
        }
        String userId = jwtProvider.getUserIdFromToken(token);
        return userLoginSessionRepository.findById(UUID.fromString(jti))
            .filter(s -> !s.isRevoked())
            .filter(s -> s.getUserId().equals(UUID.fromString(userId)))
            .isPresent();
    }
}
