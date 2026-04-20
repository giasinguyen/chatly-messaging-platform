package com.chatly.websocket;

import com.chatly.dto.request.CallSignalMessage;
import com.chatly.model.enums.CallStatus;
import com.chatly.model.enums.CallType;
import com.chatly.model.enums.SignalType;
import com.chatly.model.mongo.CallSession;
import com.chatly.model.mongo.Conversation;
import com.chatly.repository.mongo.CallSessionRepository;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class CallWebSocketController {

    private final CallSessionRepository callSessionRepository;
    private final ConversationRepository conversationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;

    /**
     * Xử lý khi caller khởi tạo cuộc gọi.
     * Lưu CallSession (RINGING) → chuyển tiếp tín hiệu đến callee.
     */
    @MessageMapping("/call.initiate")
    public void initiateCall(@Payload CallSignalMessage signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");
        signal.setSenderId(senderId);

        Map<String, Object> payload = signal.getPayload();
        String conversationId = payload != null ? (String) payload.get("conversationId") : null;
        String callTypeStr = payload != null ? (String) payload.get("callType") : "VOICE";
        CallType callType = CallType.valueOf(callTypeStr);

        // Lưu phiên cuộc gọi vào DB
        CallSession session = CallSession.builder()
                .callId(signal.getCallId())
                .conversationId(conversationId)
                .initiatorId(senderId)
                .participants(List.of(senderId, signal.getReceiverId()))
                .type(callType)
                .status(CallStatus.RINGING)
                .startedAt(LocalDateTime.now())
                .build();
        callSessionRepository.save(session);

        log.info("Call initiated: callId={} from={} to={} type={}",
                signal.getCallId(), senderId, signal.getReceiverId(), callType);

        // Chuyển tiếp tín hiệu đến callee
        messagingTemplate.convertAndSendToUser(
                signal.getReceiverId(),
                "/queue/calls",
                signal
        );
    }

    /**
     * Xử lý khi callee trả lời cuộc gọi (chấp nhận hoặc từ chối).
     * Cập nhật trạng thái CallSession → chuyển tiếp tín hiệu đến caller.
     */
    @MessageMapping("/call.answer")
    public void answerCall(@Payload CallSignalMessage signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");
        signal.setSenderId(senderId);

        Map<String, Object> payload = signal.getPayload();
        boolean accepted = payload != null && Boolean.TRUE.equals(payload.get("accepted"));

        // Cập nhật trạng thái cuộc gọi
        callSessionRepository.findByCallId(signal.getCallId()).ifPresent(session -> {
            if (accepted) {
                session.setStatus(CallStatus.ONGOING);
                session.setStartedAt(LocalDateTime.now());
            } else {
                session.setStatus(CallStatus.REJECTED);
                session.setEndedAt(LocalDateTime.now());
            }
            callSessionRepository.save(session);
            // Lưu tin nhắn cuộc gọi khi bị từ chối
            if (!accepted && session.getConversationId() != null) {
                messageService.saveCallMessage(
                        session.getConversationId(),
                        session.getInitiatorId(),
                        session.getType(),
                        CallStatus.REJECTED,
                        0L
                );
            }
        });

        log.info("Call answered: callId={} by={} accepted={}",
                signal.getCallId(), senderId, accepted);

        // Chuyển tiếp tín hiệu đến caller
        messagingTemplate.convertAndSendToUser(
                signal.getReceiverId(),
                "/queue/calls",
                signal
        );
    }

    /**
     * Chuyển tiếp ICE candidate giữa hai peer.
     * Không cần lưu DB cho ICE candidates.
     */
    @MessageMapping("/call.ice-candidate")
    public void iceCandidate(@Payload CallSignalMessage signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");
        signal.setSenderId(senderId);

        // Chuyển tiếp ICE candidate đến peer đối diện
        messagingTemplate.convertAndSendToUser(
                signal.getReceiverId(),
                "/queue/calls",
                signal
        );
    }

    /**
     * Relay renegotiation signals (e.g. upgrade voice → video).
     * Forwards RENEGOTIATE_OFFER / RENEGOTIATE_ANSWER to the peer unchanged.
     */
    @MessageMapping("/call.renegotiate")
    public void renegotiate(@Payload CallSignalMessage signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");
        signal.setSenderId(senderId);

        messagingTemplate.convertAndSendToUser(
                signal.getReceiverId(),
                "/queue/calls",
                signal
        );
    }

    /**
     * Xử lý khi một bên kết thúc cuộc gọi.
     * Cập nhật trạng thái ENDED + endedAt → thông báo cho cả hai bên.
     */
    @MessageMapping("/call.end")
    public void endCall(@Payload CallSignalMessage signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");
        signal.setSenderId(senderId);

        // Cập nhật trạng thái cuộc gọi
        callSessionRepository.findByCallId(signal.getCallId()).ifPresent(session -> {
            CallStatus previousStatus = session.getStatus();
            LocalDateTime now = LocalDateTime.now();
            session.setEndedAt(now);

            long durationSeconds = 0L;
            CallStatus finalStatus;
            if (previousStatus == CallStatus.RINGING) {
                // Caller huỷ trước khi callee trả lời → cuộc gọi nhỡ
                finalStatus = CallStatus.MISSED;
            } else {
                finalStatus = CallStatus.ENDED;
                if (session.getStartedAt() != null) {
                    durationSeconds = ChronoUnit.SECONDS.between(session.getStartedAt(), now);
                }
            }
            session.setStatus(finalStatus);
            callSessionRepository.save(session);

            // Lưu tin nhắn cuộc gọi vào lịch sử chat
            if (session.getConversationId() != null) {
                messageService.saveCallMessage(
                        session.getConversationId(),
                        session.getInitiatorId(),
                        session.getType(),
                        finalStatus,
                        durationSeconds
                );
            }
        });

        log.info("Call ended: callId={} by={}", signal.getCallId(), senderId);

        // Thông báo cho peer đối diện
        messagingTemplate.convertAndSendToUser(
                signal.getReceiverId(),
                "/queue/calls",
                signal
        );
    }

    /**
     * Initiates a group call in a conversation.
     * Saves a group CallSession and broadcasts GROUP_INITIATE to all participants.
     */
    @MessageMapping("/call.group.initiate")
    public void initiateGroupCall(@Payload CallSignalMessage signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");
        signal.setSenderId(senderId);

        Map<String, Object> payload = signal.getPayload();
        String conversationId = payload != null ? (String) payload.get("conversationId") : null;
        String callTypeStr = payload != null ? (String) payload.get("callType") : "VOICE";
        CallType callType = CallType.valueOf(callTypeStr);

        if (conversationId == null) {
            log.warn("GROUP_INITIATE from {} missing conversationId", senderId);
            return;
        }

        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        if (conversation == null) {
            log.warn("GROUP_INITIATE: conversation {} not found", conversationId);
            return;
        }

        // participants tracks only ACTIVE (joined) participants; starts with just initiator.
        List<String> activeParticipants = new ArrayList<>();
        activeParticipants.add(senderId);

        // invitees: use the caller-selected list if provided, otherwise fall back to all members.
        @SuppressWarnings("unchecked")
        List<String> selectedIds = payload != null ? (List<String>) payload.get("inviteeIds") : null;
        List<String> invitees = (selectedIds != null && !selectedIds.isEmpty())
                ? selectedIds
                : new ArrayList<>(conversation.getParticipantIds());

        CallSession session = CallSession.builder()
                .callId(signal.getCallId())
                .conversationId(conversationId)
                .initiatorId(senderId)
                .participants(activeParticipants)
                .type(callType)
                .status(CallStatus.RINGING)
                .startedAt(LocalDateTime.now())
                .build();
        callSessionRepository.save(session);

        log.info("Group call initiated: callId={} by={} conversationId={} invitees={}",
                signal.getCallId(), senderId, conversationId, invitees.size());

        // No chat message saved at initiation — members are notified via WebSocket signal.
        // A call record is only saved when the call properly ends (ENDED status).

        invitees.stream()
                .filter(id -> !id.equals(senderId))
                .forEach(id -> messagingTemplate.convertAndSendToUser(id, "/queue/calls", signal));
    }

    /**
     * Handles a participant joining an active group call.
     * Adds the joiner to active participants and notifies all other active participants
     * so they can create peer connections (offers) to the new joiner.
     */
    @MessageMapping("/call.group.join")
    public void joinGroupCall(@Payload CallSignalMessage signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");
        signal.setSenderId(senderId);

        CallSignalMessage expiredSignal = CallSignalMessage.builder()
                .type(SignalType.GROUP_LEAVE)
                .callId(signal.getCallId())
                .senderId("system")
                .build();

        callSessionRepository.findByCallId(signal.getCallId()).ifPresentOrElse(session -> {
            // Reject join if the call has already ended or was missed
            if (session.getStatus() == CallStatus.ENDED || session.getStatus() == CallStatus.MISSED) {
                log.warn("Participant {} tried to join already-ended call {}", senderId, signal.getCallId());
                messagingTemplate.convertAndSendToUser(senderId, "/queue/calls", expiredSignal);
                return;
            }
            // Add joiner to active participants list.
            if (!session.getParticipants().contains(senderId)) {
                session.getParticipants().add(senderId);
            }
            session.setStatus(CallStatus.ONGOING);
            if (session.getStartedAt() == null) {
                session.setStartedAt(LocalDateTime.now());
            }
            callSessionRepository.save(session);

            log.info("Participant {} joined group call {}. Active: {}",
                    senderId, signal.getCallId(), session.getParticipants().size());

            // Notify other ACTIVE participants to create offers for the new joiner.
            session.getParticipants().stream()
                    .filter(id -> !id.equals(senderId))
                    .forEach(id -> messagingTemplate.convertAndSendToUser(id, "/queue/calls", signal));
        }, () -> {
            // Session not found — call is dead (e.g. backend restarted)
            log.warn("Participant {} tried to join non-existent call {}", senderId, signal.getCallId());
            messagingTemplate.convertAndSendToUser(senderId, "/queue/calls", expiredSignal);
        });
    }

    /**
     * Generic relay for group call peer-to-peer signals: GROUP_OFFER, GROUP_ANSWER, ICE candidates.
     * GROUP_LEAVE removes the participant and ends the call when all active participants have left.
     */
    @MessageMapping("/call.group.signal")
    public void groupSignal(@Payload CallSignalMessage signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");
        signal.setSenderId(senderId);

        if (signal.getType() == SignalType.GROUP_LEAVE) {
            callSessionRepository.findByCallId(signal.getCallId()).ifPresent(session -> {
                CallStatus previousStatus = session.getStatus();
                session.getParticipants().remove(senderId);

                // Call ends when only 0 or 1 participant remains (1 person alone has no one to talk to)
                boolean callEnded = session.getParticipants().size() <= 1;
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

                        Map<String, Object> leavePayload = new java.util.HashMap<>();
                        leavePayload.put("callEnded", true);
                        leavePayload.put("activeParticipantCount", session.getParticipants().size());
                        signal.setPayload(leavePayload);

                    log.info("Group call {} ended ({}). Duration: {}s",
                            signal.getCallId(), finalStatus, durationSeconds);

                    // Notify ALL conversation members — invitees who haven't joined yet
                    // are not in session.getParticipants(), so we must use the conversation.
                    if (session.getConversationId() != null) {
                        conversationRepository.findById(session.getConversationId())
                                .ifPresent(conv -> conv.getParticipantIds().stream()
                                        .filter(id -> !id.equals(senderId))
                                        .forEach(id -> messagingTemplate.convertAndSendToUser(
                                                id, "/queue/calls", signal)));
                    } else {
                        session.getParticipants().forEach(id ->
                                messagingTemplate.convertAndSendToUser(id, "/queue/calls", signal));
                    }

                    // Group MISSED = nobody answered before initiator hung up.
                    // No chat message is saved — group calls only record ENDED (with duration).
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

                    Map<String, Object> leavePayload = new java.util.HashMap<>();
                    leavePayload.put("callEnded", false);
                    leavePayload.put("activeParticipantCount", session.getParticipants().size());
                    signal.setPayload(leavePayload);

                    log.info("Participant {} left group call {}. Remaining active: {}",
                            senderId, signal.getCallId(), session.getParticipants().size());

                    session.getParticipants().forEach(id ->
                            messagingTemplate.convertAndSendToUser(id, "/queue/calls", signal));
                }
            });
        } else {
            // Point-to-point relay: GROUP_OFFER, GROUP_ANSWER, ICE candidates
            messagingTemplate.convertAndSendToUser(signal.getReceiverId(), "/queue/calls", signal);
        }
    }
}
