package com.chatly.ai.mcp;

import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.format.DateTimeParseException;

/**
 * Package-private static helpers shared by all MCP tool domain classes.
 * Not a Spring bean — no injection needed.
 */
final class McpToolBase {

    static final int DEFAULT_MESSAGE_LIMIT = 20;
    static final int MAX_MESSAGE_LIMIT = 50;
    static final int MAX_MESSAGES_PER_RANGE = 100;
    static final int MAX_TIME_RANGE_DAYS = 30;
    static final int MIN_POLL_OPTIONS = 2;

    private static final Logger log = LoggerFactory.getLogger(McpToolBase.class);

    private McpToolBase() {}

    static String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            log.warn("MCP tool called with no authenticated user in SecurityContext");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return authentication.getPrincipal().toString();
    }

    static RuntimeException toToolException(AppException ex) {
        log.warn("MCP tool failed: code={} message={}", ex.getErrorCode().getCode(), ex.getErrorCode().getMessage());
        return new IllegalStateException(ex.getErrorCode().getMessage());
    }

    static int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_MESSAGE_LIMIT;
        }
        return Math.max(1, Math.min(limit, MAX_MESSAGE_LIMIT));
    }

    static Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Timestamp must be ISO-8601 format, e.g. 2025-01-01T00:00:00Z");
        }
    }
}
