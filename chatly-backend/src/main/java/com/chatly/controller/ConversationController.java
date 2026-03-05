package com.chatly.controller;

import com.chatly.dto.request.ConversationRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @PostMapping("/{creatorId}")
    ApiResponse<ConversationResponse> create(
            @PathVariable String creatorId,
            @RequestBody @Valid ConversationRequest request) {
        return ApiResponse.<ConversationResponse>builder()
                .result(conversationService.create(creatorId, request))
                .build();
    }

    @GetMapping("/{id}/user/{userId}")
    ApiResponse<ConversationResponse> getById(
            @PathVariable String id,
            @PathVariable String userId) {
        return ApiResponse.<ConversationResponse>builder()
                .result(conversationService.getById(id, userId))
                .build();
    }

    @GetMapping("/user/{userId}")
    ApiResponse<List<ConversationResponse>> getByUser(@PathVariable String userId) {
        return ApiResponse.<List<ConversationResponse>>builder()
                .result(conversationService.getByUserId(userId))
                .build();
    }

    @DeleteMapping("/{id}/user/{userId}")
    ApiResponse<Void> delete(
            @PathVariable String id,
            @PathVariable String userId) {
        conversationService.delete(id, userId);
        return ApiResponse.<Void>builder()
                .message("Conversation deleted successfully")
                .build();
    }
}
