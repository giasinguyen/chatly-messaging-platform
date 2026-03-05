package com.chatly.websocket;

import com.chatly.dto.request.ChatMessageRequest;
import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
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

    @MessageMapping("/chat.read")
    public void markAsRead(@Payload ReadReceiptRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String userId = (String) headerAccessor.getSessionAttributes().get("userId");

        MessageResponse response = messageService.markAsRead(request.messageId(), userId);

        messagingTemplate.convertAndSend(
                "/topic/conversation." + response.getConversationId(),
                response
        );
    }

    public record ReadReceiptRequest(String messageId) {}
}
