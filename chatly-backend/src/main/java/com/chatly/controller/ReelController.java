package com.chatly.controller;

import com.chatly.dto.request.CreateReelRequest;
import com.chatly.dto.request.CreatePostCommentRequest;
import com.chatly.dto.request.ReactToPostRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.PostCommentResponse;
import com.chatly.dto.response.ReelFeedResponse;
import com.chatly.dto.response.ReelResponse;
import com.chatly.model.enums.PostVisibility;
import com.chatly.service.ReelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/reels")
@RequiredArgsConstructor
public class ReelController {

    private static final int MAX_PAGE_SIZE = 30;

    private final ReelService reelService;

    @PostMapping
    ApiResponse<ReelResponse> create(
            @RequestParam("video") MultipartFile video,
            @RequestParam(required = false) String caption,
            @RequestParam(required = false) PostVisibility visibility) {
        CreateReelRequest request = CreateReelRequest.builder()
                .caption(caption)
                .visibility(visibility)
                .build();

        return ApiResponse.<ReelResponse>builder()
                .result(reelService.create(getAuthenticatedUserId(), request, video))
                .build();
    }

    @GetMapping("/feed")
    ApiResponse<ReelFeedResponse> getFeed(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<ReelFeedResponse>builder()
                .result(reelService.getFeed(getAuthenticatedUserId(), cursor, safeSize(size)))
                .build();
    }

    @GetMapping("/users/{authorId}")
    ApiResponse<ReelFeedResponse> getByAuthor(
            @PathVariable String authorId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<ReelFeedResponse>builder()
                .result(reelService.getByAuthor(authorId, getAuthenticatedUserId(), cursor, safeSize(size)))
                .build();
    }

    @GetMapping("/{reelId}")
    ApiResponse<ReelResponse> getById(@PathVariable String reelId) {
        return ApiResponse.<ReelResponse>builder()
                .result(reelService.getById(reelId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{reelId}/view")
    ApiResponse<Void> recordView(@PathVariable String reelId) {
        reelService.recordView(reelId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    @PutMapping("/{reelId}/reactions")
    ApiResponse<ReelResponse> react(
            @PathVariable String reelId,
            @RequestBody @Valid ReactToPostRequest request) {
        return ApiResponse.<ReelResponse>builder()
                .result(reelService.react(reelId, getAuthenticatedUserId(), request))
                .build();
    }

    @DeleteMapping("/{reelId}/reactions")
    ApiResponse<ReelResponse> removeReaction(@PathVariable String reelId) {
        return ApiResponse.<ReelResponse>builder()
                .result(reelService.removeReaction(reelId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{reelId}/share")
    ApiResponse<ReelResponse> share(@PathVariable String reelId) {
        return ApiResponse.<ReelResponse>builder()
                .result(reelService.share(reelId, getAuthenticatedUserId()))
                .build();
    }

    @GetMapping("/{reelId}/comments")
    ApiResponse<List<PostCommentResponse>> getComments(@PathVariable String reelId) {
        return ApiResponse.<List<PostCommentResponse>>builder()
                .result(reelService.getComments(reelId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{reelId}/comments")
    ApiResponse<PostCommentResponse> addComment(
            @PathVariable String reelId,
            @RequestBody @Valid CreatePostCommentRequest request) {
        return ApiResponse.<PostCommentResponse>builder()
                .result(reelService.addComment(reelId, getAuthenticatedUserId(), request))
                .build();
    }

    @PutMapping("/{reelId}/comments/{commentId}/reactions")
    ApiResponse<PostCommentResponse> reactToComment(
            @PathVariable String reelId,
            @PathVariable String commentId,
            @RequestBody @Valid ReactToPostRequest request) {
        return ApiResponse.<PostCommentResponse>builder()
                .result(reelService.reactToComment(reelId, commentId, getAuthenticatedUserId(), request))
                .build();
    }

    @DeleteMapping("/{reelId}/comments/{commentId}/reactions")
    ApiResponse<PostCommentResponse> removeCommentReaction(
            @PathVariable String reelId,
            @PathVariable String commentId) {
        return ApiResponse.<PostCommentResponse>builder()
                .result(reelService.removeCommentReaction(reelId, commentId, getAuthenticatedUserId()))
                .build();
    }

    private int safeSize(int size) {
        return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
