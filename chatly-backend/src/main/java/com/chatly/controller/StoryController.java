package com.chatly.controller;

import com.chatly.dto.request.ReactRequest;
import com.chatly.dto.request.StoryCreationRequest;
import com.chatly.dto.request.StoryReplyRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.StoryReactionResponse;
import com.chatly.dto.response.StoryReplyResponse;
import com.chatly.dto.response.StoryResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.service.StoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping
    ApiResponse<StoryResponse> create(@RequestBody @Valid StoryCreationRequest request) {
        return ApiResponse.<StoryResponse>builder()
                .result(storyService.createStory(getAuthenticatedUserId(), request))
                .build();
    }

    @GetMapping("/feed")
    ApiResponse<List<StoryResponse>> getFeed() {
        return ApiResponse.<List<StoryResponse>>builder()
                .result(storyService.getStoriesFeed(getAuthenticatedUserId()))
                .build();
    }

    @GetMapping("/me")
    ApiResponse<List<StoryResponse>> getMyStories() {
        return ApiResponse.<List<StoryResponse>>builder()
                .result(storyService.getUserStories(getAuthenticatedUserId()))
                .build();
    }

    @GetMapping("/users/{userId}")
    ApiResponse<List<StoryResponse>> getUserStories(@PathVariable String userId) {
        return ApiResponse.<List<StoryResponse>>builder()
                .result(storyService.getActiveStoriesForUser(userId))
                .build();
    }

    @PostMapping("/{storyId}/view")
    ApiResponse<Void> recordView(@PathVariable String storyId) {
        storyService.recordView(storyId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/{storyId}/viewers")
    ApiResponse<List<UserResponse>> getViewers(@PathVariable String storyId) {
        return ApiResponse.<List<UserResponse>>builder()
                .result(storyService.getViewers(storyId, getAuthenticatedUserId()))
                .build();
    }

    @DeleteMapping("/{storyId}")
    ApiResponse<Void> deleteStory(@PathVariable String storyId) {
        storyService.deleteStory(storyId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/{storyId}/react")
    ApiResponse<StoryReactionResponse> react(
            @PathVariable String storyId,
            @RequestBody @Valid ReactRequest request) {
        return ApiResponse.<StoryReactionResponse>builder()
                .result(storyService.reactToStory(storyId, getAuthenticatedUserId(), request))
                .build();
    }

    @DeleteMapping("/{storyId}/react")
    ApiResponse<Void> removeReaction(@PathVariable String storyId) {
        storyService.removeReaction(storyId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/{storyId}/reactions")
    ApiResponse<List<StoryReactionResponse>> getReactions(@PathVariable String storyId) {
        return ApiResponse.<List<StoryReactionResponse>>builder()
                .result(storyService.getReactions(storyId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{storyId}/reply")
    ApiResponse<StoryReplyResponse> reply(
            @PathVariable String storyId,
            @RequestBody @Valid StoryReplyRequest request) {
        return ApiResponse.<StoryReplyResponse>builder()
                .result(storyService.replyToStory(storyId, getAuthenticatedUserId(), request))
                .build();
    }

    @GetMapping("/{storyId}/replies")
    ApiResponse<List<StoryReplyResponse>> getReplies(@PathVariable String storyId) {
        return ApiResponse.<List<StoryReplyResponse>>builder()
                .result(storyService.getReplies(storyId, getAuthenticatedUserId()))
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
