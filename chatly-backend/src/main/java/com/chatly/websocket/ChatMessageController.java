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

import java.util.Map;

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

    @MessageMapping("/chat.seen")
    public void markAsSeen(@Payload SeenRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String userId = (String) headerAccessor.getSessionAttributes().get("userId");

        MessageResponse response = messageService.markAsSeen(request.messageId(), userId);

        messagingTemplate.convertAndSend(
                "/topic/conversation." + response.getConversationId(),
                response
        );
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String userId = (String) headerAccessor.getSessionAttributes().get("userId");

        messagingTemplate.convertAndSend(
                "/topic/conversation." + request.conversationId() + ".typing",
                Map.of("userId", userId, "typing", request.typing())
        );
    }

    public record SeenRequest(String messageId) {}
    public record TypingRequest(String conversationId, boolean typing) {}
}
