package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.UserSessionResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.security.JwtProvider;
import com.chatly.service.UserSessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/sessions")
@RequiredArgsConstructor
public class AuthSessionController {

    private final UserSessionService userSessionService;
    private final JwtProvider jwtProvider;

    @GetMapping
    ApiResponse<List<UserSessionResponse>> listSessions(HttpServletRequest request) {
        UUID userId = currentUserId();
        UUID currentSessionId = resolveCurrentSessionId(request);
        return ApiResponse.<List<UserSessionResponse>>builder()
            .result(userSessionService.listSessions(userId, currentSessionId))
            .build();
    }

    @DeleteMapping("/{sessionId}")
    ApiResponse<Void> revokeSession(@PathVariable UUID sessionId) {
        UUID userId = currentUserId();
        userSessionService.revokeSession(sessionId, userId);
        return ApiResponse.<Void>builder()
            .message("Session revoked")
            .build();
    }

    private static UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return UUID.fromString(authentication.getPrincipal().toString());
    }

    private UUID resolveCurrentSessionId(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (!StringUtils.hasText(bearer) || !bearer.startsWith("Bearer ")) {
            return null;
        }
        String jwt = bearer.substring(7);
        String jti = jwtProvider.getSessionIdFromToken(jwt);
        if (!StringUtils.hasText(jti)) {
            return null;
        }
        try {
            return UUID.fromString(jti);
        } catch (Exception e) {
            return null;
        }
    }
}
