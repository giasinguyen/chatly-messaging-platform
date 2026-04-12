package com.chatly.service;

import com.chatly.dto.session.StartLoginSessionResult;
import com.chatly.dto.response.UserSessionResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.model.enums.ClientPlatform;
import com.chatly.model.postgres.User;
import com.chatly.model.postgres.UserLoginSession;
import com.chatly.dto.geo.GeoIpResolution;
import com.chatly.repository.postgres.UserLoginSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserSessionService {

    private final UserLoginSessionRepository userLoginSessionRepository;

    /**
     * Revoke prior session on same platform (if any), then create a new session.
     * Email alerts are sent asynchronously from {@link AuthService} so SMTP does not block the HTTP response.
     */
    @Transactional
    public StartLoginSessionResult startNewLoginSession(
        User user,
        ClientPlatform platform,
        String deviceLabel,
        String userAgent,
        String ipAddress,
        GeoIpResolution geo
    ) {
        List<UserLoginSession> previous = userLoginSessionRepository
            .findByUserIdAndPlatformAndRevokedFalse(user.getId(), platform);

        UserLoginSession replaced = null;
        if (!previous.isEmpty()) {
            replaced = previous.get(0);
            for (UserLoginSession s : previous) {
                revokeSessionRecord(s);
            }
        }

        UserLoginSession session = UserLoginSession.builder()
            .userId(user.getId())
            .platform(platform)
            .deviceLabel(deviceLabel)
            .userAgent(userAgent)
            .ipAddress(ipAddress)
            .locationLabel(geo != null ? geo.locationLabel() : null)
            .geoSnapshot(geo != null ? geo.snapshot() : null)
            .lastSeenAt(Instant.now())
            .build();
        session = userLoginSessionRepository.save(session);
        return new StartLoginSessionResult(session, replaced);
    }

    @Transactional
    public void revokeSession(UUID sessionId, UUID userId) {
        UserLoginSession s = userLoginSessionRepository.findByIdAndUserId(sessionId, userId)
            .orElseThrow(() -> new AppException(ErrorCode.SESSION_NOT_FOUND));
        if (s.isRevoked()) {
            return;
        }
        revokeSessionRecord(s);
    }

    @Transactional
    public void revokeAllForUser(UUID userId) {
        userLoginSessionRepository.revokeAllForUser(userId, Instant.now());
    }

    public UserLoginSession requireActiveSession(UUID sessionId, UUID userId) {
        UserLoginSession s = userLoginSessionRepository.findById(sessionId)
            .orElseThrow(() -> new AppException(ErrorCode.INVALID_TOKEN));
        if (s.isRevoked() || !s.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }
        return s;
    }

    public List<UserSessionResponse> listSessions(UUID userId, UUID currentSessionId) {
        return userLoginSessionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(s -> UserSessionResponse.builder()
                .id(s.getId().toString())
                .platform(s.getPlatform().name())
                .deviceLabel(s.getDeviceLabel())
                .ipAddress(s.getIpAddress())
                .locationLabel(s.getLocationLabel())
                .geoSnapshot(s.getGeoSnapshot())
                .createdAt(s.getCreatedAt())
                .lastSeenAt(s.getLastSeenAt())
                .current(!s.isRevoked() && currentSessionId != null && s.getId().equals(currentSessionId))
                .revoked(s.isRevoked())
                .revokedAt(s.getRevokedAt())
                .build())
            .collect(Collectors.toList());
    }

    /**
     * Deletes every session row for the user (ended + active). Current JWT/refresh will stop working;
     * client must sign in again.
     */
    @Transactional
    public void purgeAllSessionsForUser(UUID userId) {
        userLoginSessionRepository.deleteByUserId(userId);
    }

    private void revokeSessionRecord(UserLoginSession s) {
        s.setRevoked(true);
        s.setRevokedAt(Instant.now());
        userLoginSessionRepository.save(s);
    }

    @Transactional
    public void touchSession(UUID sessionId) {
        userLoginSessionRepository.findById(sessionId).ifPresent(s -> {
            if (!s.isRevoked()) {
                s.setLastSeenAt(Instant.now());
                userLoginSessionRepository.save(s);
            }
        });
    }
}
