package com.chatly.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "token:blacklist:";
    private final RedisTemplate<String, String> redisTemplate;

    public void blacklistToken(String token, long expirationTimeSeconds) {
        try {
            String key = BLACKLIST_PREFIX + token;
            redisTemplate.opsForValue().set(key, "true", expirationTimeSeconds, TimeUnit.SECONDS);
            log.info("Token blacklisted successfully");
        } catch (Exception e) {
            log.error("Failed to blacklist token", e);
            throw new RuntimeException("Failed to blacklist token", e);
        }
    }

    public boolean isTokenBlacklisted(String token) {
        try {
            String key = BLACKLIST_PREFIX + token;
            Boolean exists = redisTemplate.hasKey(key);
            return exists != null && exists;
        } catch (Exception e) {
            log.error("Failed to check token blacklist status", e);
            // In case of Redis failure, we fail open (allow the request)
            // You might want to fail closed (deny) depending on security requirements
            return false;
        }
    }

    public void removeFromBlacklist(String token) {
        try {
            String key = BLACKLIST_PREFIX + token;
            redisTemplate.delete(key);
            log.info("Token removed from blacklist");
        } catch (Exception e) {
            log.error("Failed to remove token from blacklist", e);
        }
    }
}
