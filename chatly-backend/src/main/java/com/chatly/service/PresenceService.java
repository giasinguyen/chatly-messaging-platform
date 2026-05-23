package com.chatly.service;

import com.chatly.dto.response.PresenceResponse;
import com.chatly.model.enums.UserStatus;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.UserSettingsRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PresenceService {

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Mark user as ONLINE when WebSocket connects.
     */
    @Transactional
    public void setOnline(String userId) {
        try {
            UUID uid = UUID.fromString(userId);
            userRepository.findById(uid).ifPresent(user -> {
                user.setStatus(UserStatus.ONLINE);
                userRepository.save(user);
                broadcastPresence(user);
                log.debug("User {} is now ONLINE", userId);
            });
        } catch (IllegalArgumentException e) {
            log.warn("Invalid userId for presence update: {}", userId);
        }
    }

    /**
     * Mark user as OFFLINE when WebSocket disconnects.
     */
    @Transactional
    public void setOffline(String userId) {
        try {
            UUID uid = UUID.fromString(userId);
            userRepository.findById(uid).ifPresent(user -> {
                user.setStatus(UserStatus.OFFLINE);
                user.setLastSeen(Instant.now());
                userRepository.save(user);
                broadcastPresence(user);
                log.debug("User {} is now OFFLINE, lastSeen={}", userId, user.getLastSeen());
            });
        } catch (IllegalArgumentException e) {
            log.warn("Invalid userId for presence update: {}", userId);
        }
    }

    /**
     * Broadcast presence change to all subscribers via WebSocket.
     */
    private void broadcastPresence(User user) {
        var privacy = userSettingsRepository.findByUserId(user.getId().toString())
                .map(settings -> settings.getPrivacy())
                .orElse(null);
        boolean isOnlineStatusVisible = privacy == null
                || !Boolean.FALSE.equals(privacy.getShowOnlineStatus());
        boolean isLastSeenVisible = privacy == null
                || !Boolean.FALSE.equals(privacy.getShowLastSeen());
        PresenceResponse response = PresenceResponse.builder()
                .userId(user.getId().toString())
                .status(isOnlineStatusVisible ? user.getStatus() : UserStatus.OFFLINE)
                .lastSeen(isLastSeenVisible ? user.getLastSeen() : null)
                .build();

        messagingTemplate.convertAndSend("/topic/presence", response);
    }

    public void broadcastCurrentPresence(String userId) {
        try {
            UUID uid = UUID.fromString(userId);
            userRepository.findById(uid).ifPresent(this::broadcastPresence);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid userId for presence broadcast: {}", userId);
        }
    }
}
