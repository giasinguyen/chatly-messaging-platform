package com.chatly.security;

import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Ensures JWT access/refresh tokens were issued after the user's last password change.
 * Tokens minted before a password change are rejected (forces re-login on all devices).
 */
@Component
@RequiredArgsConstructor
public class PasswordChangeTokenValidator {

    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;

    public boolean isTokenValidAgainstPasswordChange(String token) {
        if (!jwtProvider.validateToken(token)) {
            return false;
        }

        String userId = jwtProvider.getUserIdFromToken(token);
        User user = userRepository.findById(UUID.fromString(userId)).orElse(null);
        if (user == null) {
            return false;
        }

        Date issued = jwtProvider.getIssuedAt(token);
        if (issued == null) {
            return false;
        }
        Instant issuedAt = issued.toInstant();
        Instant boundary = user.getPasswordChangedAt() != null
            ? user.getPasswordChangedAt()
            : user.getCreatedAt();
        if (boundary == null) {
            return true;
        }
        return !issuedAt.isBefore(boundary);
    }
}
