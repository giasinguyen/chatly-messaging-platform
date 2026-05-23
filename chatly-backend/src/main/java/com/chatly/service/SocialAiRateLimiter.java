package com.chatly.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Per-user rate limiter for social AI features backed by Redis.
 *
 * Uses a simple hourly counter: the first increment sets a 1-hour TTL.
 * Subsequent calls within the same hour increment the counter and are
 * rejected once the limit is exceeded.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SocialAiRateLimiter {

    private static final String KEY_PREFIX = "social_ai:mention:";
    private static final long WINDOW_SECONDS = 3600L;

    private final RedisTemplate<String, String> redisTemplate;

    @Value("${app.social-ai.mention.rate-limit-per-hour:10}")
    private int rateLimitPerHour;

    /**
     * Attempts to consume one token for {@code userId}.
     *
     * @return {@code true} if the request is within the rate limit, {@code false} if exceeded
     */
    public boolean tryConsume(String userId) {
        String key = KEY_PREFIX + userId;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
            }
            boolean allowed = count != null && count <= rateLimitPerHour;
            if (!allowed) {
                log.warn("Social AI rate limit exceeded: userId={} count={} limit={}", userId, count, rateLimitPerHour);
            }
            return allowed;
        } catch (Exception ex) {
            log.warn("Rate limiter Redis error for userId={}, allowing request: {}", userId, ex.getMessage());
            return true;
        }
    }
}
