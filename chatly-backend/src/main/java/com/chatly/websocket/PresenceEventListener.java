package com.chatly.websocket;

import com.chatly.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceEventListener {

    private final PresenceService presenceService;

    @EventListener
    public void handleSessionConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String userId = getUserIdFromSession(accessor);

        if (userId != null) {
            presenceService.setOnline(userId);
            log.info("WebSocket CONNECTED: userId={}, sessionId={}", userId, accessor.getSessionId());
        }
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String userId = getUserIdFromSession(accessor);

        if (userId != null) {
            presenceService.setOffline(userId);
            log.info("WebSocket DISCONNECTED: userId={}, sessionId={}", userId, accessor.getSessionId());
        }
    }

    private String getUserIdFromSession(StompHeaderAccessor accessor) {
        if (accessor.getSessionAttributes() != null) {
            Object userId = accessor.getSessionAttributes().get("userId");
            if (userId != null) {
                return userId.toString();
            }
        }
        // Fallback: try from Principal (JwtPrincipal)
        if (accessor.getUser() instanceof JwtPrincipal principal) {
            return principal.userId();
        }
        return null;
    }
}
