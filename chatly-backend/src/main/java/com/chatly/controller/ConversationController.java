package com.chatly.controller;

import com.chatly.dto.request.ConversationRequest;
import com.chatly.dto.request.MuteConversationRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.dto.response.PagedResponse;
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

    @GetMapping("/search")
    ApiResponse<PagedResponse<ConversationResponse>> search(
            @RequestParam("q") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<PagedResponse<ConversationResponse>>builder()
                .result(conversationService.search(getAuthenticatedUserId(), keyword, page, size))
                .build();
    }

    @DeleteMapping("/{id}")
    ApiResponse<Void> delete(@PathVariable String id) {
        conversationService.delete(id, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("Conversation deleted successfully")
                .build();
    }

    @DeleteMapping("/{id}/dissolve")
    ApiResponse<Void> dissolve(@PathVariable String id) {
        conversationService.dissolve(id, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("Group dissolved successfully")
                .build();
    }

    // ==================== Pin / Unpin ====================

    @PutMapping("/{id}/pin")
    ApiResponse<Void> pin(@PathVariable String id) {
        conversationService.pinConversation(id, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("Conversation pinned successfully")
                .build();
    }

    @PutMapping("/{id}/unpin")
    ApiResponse<Void> unpin(@PathVariable String id) {
        conversationService.unpinConversation(id, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("Conversation unpinned successfully")
                .build();
    }

    // ==================== Mute / Unmute ====================

    @PutMapping("/{id}/mute")
    ApiResponse<Void> mute(@PathVariable String id, @RequestBody(required = false) MuteConversationRequest request) {
        conversationService.muteConversation(id, getAuthenticatedUserId(), request);
        return ApiResponse.<Void>builder()
                .message("Conversation muted successfully")
                .build();
    }

    @PutMapping("/{id}/unmute")
    ApiResponse<Void> unmute(@PathVariable String id) {
        conversationService.unmuteConversation(id, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("Conversation unmuted successfully")
                .build();
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getPrincipal().toString();
    }
}
