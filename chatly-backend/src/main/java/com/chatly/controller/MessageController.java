package com.chatly.controller;

import com.chatly.dto.request.EditMessageRequest;
import com.chatly.dto.request.ForwardMessageRequest;
import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.request.PollVoteRequest;
import com.chatly.dto.request.ReactRequest;
import com.chatly.dto.request.TagPriorityRequest;
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

    @PostMapping("/forward")
    ApiResponse<List<MessageResponse>> forward(@RequestBody @Valid ForwardMessageRequest request) {
        return ApiResponse.<List<MessageResponse>>builder()
                .result(messageService.forward(getAuthenticatedUserId(), request))
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

    @GetMapping("/conversation/{conversationId}/search")
    ApiResponse<List<MessageResponse>> search(
            @PathVariable String conversationId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<List<MessageResponse>>builder()
                .result(messageService.search(conversationId, getAuthenticatedUserId(), keyword, page, size))
                .build();
    }

    // ── Poll Vote ───────────────────────────────────────────────────
    @PutMapping("/{messageId}/vote")
    ApiResponse<MessageResponse> votePoll(
            @PathVariable String messageId,
            @RequestBody @Valid PollVoteRequest request) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.votePoll(messageId, getAuthenticatedUserId(), request.getOptionIndex()))
                .build();
    }

    // ── Close Poll ──────────────────────────────────────────────────
    @PutMapping("/{messageId}/close-poll")
    ApiResponse<MessageResponse> closePoll(@PathVariable String messageId) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.closePoll(messageId, getAuthenticatedUserId()))
                .build();
    }

    // ── Pin / Unpin ─────────────────────────────────────────────────
    @PutMapping("/{messageId}/pin")
    ApiResponse<MessageResponse> togglePin(@PathVariable String messageId) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.togglePin(messageId, getAuthenticatedUserId()))
                .build();
    }

    @GetMapping("/conversation/{conversationId}/pinned")
    ApiResponse<List<MessageResponse>> getPinnedMessages(@PathVariable String conversationId) {
        return ApiResponse.<List<MessageResponse>>builder()
                .result(messageService.getPinnedMessages(conversationId, getAuthenticatedUserId()))
                .build();
    }

    // ── Tag Priority (Important / Urgent) ───────────────────────────
    @PutMapping("/{messageId}/priority")
    ApiResponse<MessageResponse> tagPriority(
            @PathVariable String messageId,
            @RequestBody @Valid TagPriorityRequest request) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.tagPriority(messageId, getAuthenticatedUserId(), request.getPriority()))
                .build();
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getPrincipal().toString();
    }
}
