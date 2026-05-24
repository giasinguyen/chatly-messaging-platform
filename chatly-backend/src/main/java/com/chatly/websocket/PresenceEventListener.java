package com.chatly.websocket;

import com.chatly.model.enums.CallStatus;
import com.chatly.model.mongo.CallSession;
import com.chatly.repository.mongo.CallSessionRepository;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.service.MessageService;
import com.chatly.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceEventListener {

    private final PresenceService presenceService;
    private final CallSessionRepository callSessionRepository;
    private final ConversationRepository conversationRepository;
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

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
            cleanUpGroupCallsOnDisconnect(userId);
        }
    }

    /**
     * When a user disconnects abruptly (browser closed, network drop), automatically
     * remove them from any active group call sessions they were part of.
     * Ends the call if only 1 participant remains.
     */
    private void cleanUpGroupCallsOnDisconnect(String userId) {
        List<CallSession> activeSessions = callSessionRepository
                .findByIsGroupTrueAndParticipantsContainingAndStatusIn(
                        userId, List.of(CallStatus.RINGING, CallStatus.ONGOING));

        for (CallSession session : activeSessions) {
            CallStatus previousStatus = session.getStatus();
            session.getParticipants().remove(userId);

            boolean callEnded = session.getParticipants().size() <= 1;
            java.util.Map<String, Object> leavePayload = new java.util.HashMap<>();
            leavePayload.put("callEnded", callEnded);
            leavePayload.put("activeParticipantCount", session.getParticipants().size());

            if (callEnded) {
                LocalDateTime now = LocalDateTime.now();
                session.setEndedAt(now);

                long durationSeconds = 0L;
                CallStatus finalStatus;
                if (previousStatus == CallStatus.RINGING) {
                    finalStatus = CallStatus.MISSED;
                } else {
                    finalStatus = CallStatus.ENDED;
                    if (session.getStartedAt() != null) {
                        durationSeconds = java.time.temporal.ChronoUnit.SECONDS
                                .between(session.getStartedAt(), now);
                    }
                }
                session.setStatus(finalStatus);
                callSessionRepository.save(session);

                log.info("Group call {} ended (disconnect cleanup, {}). Duration: {}s",
                        session.getCallId(), finalStatus, durationSeconds);

                // Notify ALL conversation members — invitees not yet joined are absent
                // from session.getParticipants(), so use the conversation member list.
                final String leavingUserId = userId;
                if (session.getConversationId() != null) {
                    conversationRepository.findById(session.getConversationId())
                            .ifPresent(conv -> conv.getParticipantIds().stream()
                                    .filter(id -> !id.equals(leavingUserId))
                                    .forEach(id -> {
                                        com.chatly.dto.request.CallSignalMessage leaveSignal =
                                                com.chatly.dto.request.CallSignalMessage.builder()
                                                        .type(com.chatly.model.enums.SignalType.GROUP_LEAVE)
                                                        .callId(session.getCallId())
                                                        .senderId(leavingUserId)
                                                        .payload(leavePayload)
                                                        .build();
                                        messagingTemplate.convertAndSendToUser(id, "/queue/calls", leaveSignal);
                                    }));
                } else {
                    session.getParticipants().forEach(remainingId -> {
                        com.chatly.dto.request.CallSignalMessage leaveSignal =
                                com.chatly.dto.request.CallSignalMessage.builder()
                                        .type(com.chatly.model.enums.SignalType.GROUP_LEAVE)
                                        .callId(session.getCallId())
                                        .senderId(userId)
                                        .payload(leavePayload)
                                        .build();
                        messagingTemplate.convertAndSendToUser(remainingId, "/queue/calls", leaveSignal);
                    });
                }

                // Group MISSED = nobody answered; no chat message saved for group calls.
                if (finalStatus != CallStatus.MISSED && session.getConversationId() != null) {
                    messageService.saveCallMessage(
                            session.getConversationId(),
                            session.getInitiatorId(),
                            session.getType(),
                            finalStatus,
                            durationSeconds,
                            session.getCallId()
                    );
                }
            } else {
                callSessionRepository.save(session);
                log.info("User {} disconnected from group call {}. Remaining: {}",
                        userId, session.getCallId(), session.getParticipants().size());

                // Notify remaining participants that this user left
                com.chatly.dto.request.CallSignalMessage leaveSignal =
                        com.chatly.dto.request.CallSignalMessage.builder()
                                .type(com.chatly.model.enums.SignalType.GROUP_LEAVE)
                                .callId(session.getCallId())
                                .senderId(userId)
                                .payload(leavePayload)
                                .build();
                session.getParticipants().forEach(remainingId ->
                        messagingTemplate.convertAndSendToUser(remainingId, "/queue/calls", leaveSignal));
            }
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
