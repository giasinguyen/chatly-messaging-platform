package com.chatly.controller;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.MessageResponse;
import com.chatly.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping("/{senderId}")
    ApiResponse<MessageResponse> send(
            @PathVariable String senderId,
            @RequestBody @Valid MessageRequest request) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.send(senderId, request))
                .build();
    }

    @GetMapping("/conversation/{conversationId}/user/{userId}")
    ApiResponse<List<MessageResponse>> getByConversation(
            @PathVariable String conversationId,
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<List<MessageResponse>>builder()
                .result(messageService.getByConversation(conversationId, userId, page, size))
                .build();
    }

    @PutMapping("/{messageId}/read/{userId}")
    ApiResponse<MessageResponse> markAsRead(
            @PathVariable String messageId,
            @PathVariable String userId) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.markAsRead(messageId, userId))
                .build();
    }

    @DeleteMapping("/{messageId}/user/{senderId}")
    ApiResponse<Void> delete(
            @PathVariable String messageId,
            @PathVariable String senderId) {
        messageService.delete(messageId, senderId);
        return ApiResponse.<Void>builder()
                .message("Message deleted successfully")
                .build();
    }
}
