package com.chatly.websocket;

import com.chatly.dto.request.CallSignalMessage;
import com.chatly.model.enums.CallStatus;
import com.chatly.model.enums.CallType;
import com.chatly.model.mongo.CallSession;
import com.chatly.repository.mongo.CallSessionRepository;
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
import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class CallWebSocketController {

    private final CallSessionRepository callSessionRepository;
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
}
