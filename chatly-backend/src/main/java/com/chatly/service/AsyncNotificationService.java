package com.chatly.service;

import com.chatly.model.enums.ClientPlatform;
import com.chatly.model.postgres.User;
import com.chatly.model.postgres.UserLoginSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Sends security emails outside the HTTP request thread so login/register stay fast (avoids tunnel timeouts / 502).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncNotificationService {

    private final EmailVerificationMailService emailVerificationMailService;

    @Async
    public void sendConcurrentLoginAlertAsync(
        User user,
        ClientPlatform platform,
        String newDeviceLabel,
        String newIp,
        String newLocation,
        UserLoginSession replacedSession
    ) {
        try {
            emailVerificationMailService.sendConcurrentLoginAlert(
                user, platform, newDeviceLabel, newIp, newLocation, replacedSession
            );
        } catch (Exception e) {
            log.warn("Async concurrent-login email failed for user {}", user.getId(), e);
        }
    }

    @Async
    public void sendPasswordChangedNoticeAsync(User user, Instant occurredAt) {
        try {
            emailVerificationMailService.sendPasswordChangedNotice(user, occurredAt);
        } catch (Exception e) {
            log.warn("Async password-changed email failed for user {}", user.getId(), e);
        }
    }
}
