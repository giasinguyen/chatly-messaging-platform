package com.chatly.scheduler;

import com.chatly.proxy.AgentProxyClient;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyBriefingScheduler {

    private final UserRepository userRepository;
    private final AgentProxyClient agentProxyClient;

    private static final int ACTIVE_WINDOW_DAYS = 7;

    /**
     * Every morning at 07:00 Vietnam time, trigger the daily briefing for
     * users who have been active in the last 7 days.
     */
    @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Ho_Chi_Minh")
    public void triggerDailyBriefings() {
        Instant since = Instant.now().minus(ACTIVE_WINDOW_DAYS, ChronoUnit.DAYS);
        List<String> userIds = userRepository.findActiveUsersSince(since)
                .stream()
                .map(user -> user.getId().toString())
                .toList();

        log.info("DailyBriefingScheduler: triggering briefings for {} active users", userIds.size());

        for (String userId : userIds) {
            try {
                agentProxyClient.triggerBriefingAsync(userId);
            } catch (Exception e) {
                log.error("Failed to trigger briefing for user={}: {}", userId, e.getMessage());
            }
        }
    }
}
