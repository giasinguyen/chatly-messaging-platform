package com.chatly.controller;

import com.chatly.dto.request.EditMessageRequest;
import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.request.ReactRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.MessageResponse;
import com.chatly.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    ApiResponse<MessageResponse> send(@RequestBody @Valid MessageRequest request) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.send(getAuthenticatedUserId(), request))
                .build();
    }

    @GetMapping("/conversation/{conversationId}")
    ApiResponse<List<MessageResponse>> getByConversation(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<List<MessageResponse>>builder()
                .result(messageService.getByConversation(conversationId, getAuthenticatedUserId(), page, size))
                .build();
    }

    @PutMapping("/{messageId}/seen")
    ApiResponse<MessageResponse> markAsSeen(@PathVariable String messageId) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.markAsSeen(messageId, getAuthenticatedUserId()).orElse(null))
                .build();
    }

    @PutMapping("/{messageId}/recall")
    ApiResponse<MessageResponse> recall(@PathVariable String messageId) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.recall(messageId, getAuthenticatedUserId()))
                .build();
    }

    @PutMapping("/{messageId}/edit")
    ApiResponse<MessageResponse> edit(
            @PathVariable String messageId,
            @RequestBody @Valid EditMessageRequest request) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.edit(messageId, getAuthenticatedUserId(), request.getContent()))
                .build();
    }

    @DeleteMapping("/{messageId}")
    ApiResponse<Void> delete(@PathVariable String messageId) {
        messageService.delete(messageId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("Message deleted successfully")
                .build();
    }

    @PutMapping("/{messageId}/react")
    ApiResponse<MessageResponse> react(
            @PathVariable String messageId,
            @RequestBody @Valid ReactRequest request) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.react(messageId, getAuthenticatedUserId(), request.getEmoji()))
                .build();
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getPrincipal().toString();
    }
}
