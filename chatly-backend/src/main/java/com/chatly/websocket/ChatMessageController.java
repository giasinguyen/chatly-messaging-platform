package com.chatly.websocket;

import com.chatly.dto.request.ChatMessageRequest;
import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.exception.AppException;
import com.chatly.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatMessageController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = (String) headerAccessor.getSessionAttributes().get("userId");

        MessageRequest messageRequest = MessageRequest.builder()
                .conversationId(request.getConversationId())
                .content(request.getContent())
                .type(request.getType())
                .replyToId(request.getReplyToId())
                .attachments(request.getAttachments())
                .build();

        MessageResponse response = messageService.send(senderId, messageRequest);

        messagingTemplate.convertAndSend(
                "/topic/conversation." + request.getConversationId(),
                response
        );
    }

    @MessageMapping("/chat.seen")
    public void markAsSeen(@Payload SeenRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String userId = (String) headerAccessor.getSessionAttributes().get("userId");

        messageService.markAsSeen(request.messageId(), userId).ifPresent(response ->
                messagingTemplate.convertAndSend(
                        "/topic/conversation." + response.getConversationId() + ".read",
                        response
                )
        );
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String userId = (String) headerAccessor.getSessionAttributes().get("userId");

        messagingTemplate.convertAndSend(
                "/topic/conversation." + request.conversationId() + ".typing",
                (Object) Map.of("userId", userId, "typing", request.typing())
        );
    }

    // ── Error handling ────────────────────────────────────────────────────────
    // Trả lỗi về đúng user đang thao tác (qua /user/queue/errors)
    // Cần JwtHandshakeHandler để Principal được gán vào session.

    @MessageExceptionHandler(AppException.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleAppException(AppException ex) {
        log.warn("WebSocket AppException: code={} message={}", ex.getErrorCode().getCode(), ex.getMessage());
        return Map.of(
                "code", ex.getErrorCode().getCode(),
                "message", ex.getMessage()
        );
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleGenericException(Exception ex) {
        log.error("WebSocket unhandled exception: {}", ex.getMessage(), ex);
        return Map.of(
                "code", 9999,
                "message", "Internal server error"
        );
    }

    public record SeenRequest(String messageId) {}
    public record TypingRequest(String conversationId, boolean typing) {}
}
