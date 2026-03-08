package com.chatly.controller;

import com.chatly.dto.request.ConversationRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @PostMapping
    ApiResponse<ConversationResponse> create(@RequestBody @Valid ConversationRequest request) {
        return ApiResponse.<ConversationResponse>builder()
                .result(conversationService.create(getAuthenticatedUserId(), request))
                .build();
    }

    @GetMapping("/{id}")
    ApiResponse<ConversationResponse> getById(@PathVariable String id) {
        return ApiResponse.<ConversationResponse>builder()
                .result(conversationService.getById(id, getAuthenticatedUserId()))
                .build();
    }

    @GetMapping
    ApiResponse<List<ConversationResponse>> getByUser() {
        return ApiResponse.<List<ConversationResponse>>builder()
                .result(conversationService.getByUserId(getAuthenticatedUserId()))
                .build();
    }

    @DeleteMapping("/{id}")
    ApiResponse<Void> delete(@PathVariable String id) {
        conversationService.delete(id, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("Conversation deleted successfully")
                .build();
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getPrincipal().toString();
    }
}
