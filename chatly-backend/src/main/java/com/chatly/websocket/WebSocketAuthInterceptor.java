package com.chatly.websocket;

import com.chatly.security.JwtProvider;
import com.chatly.security.PasswordChangeTokenValidator;
import com.chatly.security.SessionTokenValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private final JwtProvider jwtProvider;
    private final PasswordChangeTokenValidator passwordChangeTokenValidator;
    private final SessionTokenValidator sessionTokenValidator;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {

        log.info("WebSocket handshake attempt: path={}", request.getURI().getPath());
        String token = extractToken(request);

        String rejectReason = getRejectReason(token);
        if (rejectReason == null) {
            String userId = jwtProvider.getUserIdFromToken(token);
            attributes.put("userId", userId);
            log.info("WebSocket handshake ACCEPTED for userId={}", userId);
            return true;
        }

        log.warn("WebSocket handshake REJECTED: reason={}", rejectReason);
        return false;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
    }

    private String extractToken(ServerHttpRequest request) {
        // 1. Try servlet request parameter
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String token = servletRequest.getServletRequest().getParameter("token");
            if (StringUtils.hasText(token)) return token;
        }

        // 2. Fallback: parse from URI query string (SockJS transports)
        String query = request.getURI().getQuery();
        if (StringUtils.hasText(query)) {
            for (String param : query.split("&")) {
                String[] kv = param.split("=", 2);
                if (kv.length == 2 && "token".equals(kv[0])) {
                    return kv[1];
                }
            }
        }

        return null;
    }

    private String getRejectReason(String token) {
        if (!StringUtils.hasText(token)) {
            return "missing_token";
        }

        try {
            if (!jwtProvider.validateToken(token)) {
                return "invalid_token";
            }
            if (!passwordChangeTokenValidator.isTokenValidAgainstPasswordChange(token)) {
                return "password_changed";
            }
            if (!sessionTokenValidator.isSessionTokenAcceptable(token)) {
                return "session_revoked_or_missing";
            }
            return null;
        } catch (Exception ex) {
            log.warn("WebSocket token validation failed: {}", ex.getClass().getSimpleName());
            return "token_validation_error";
        }
    }
}
