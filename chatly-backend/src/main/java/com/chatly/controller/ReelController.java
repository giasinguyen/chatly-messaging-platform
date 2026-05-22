package com.chatly.controller;

import com.chatly.dto.request.CreateReelRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ReelFeedResponse;
import com.chatly.dto.response.ReelResponse;
import com.chatly.model.enums.PostVisibility;
import com.chatly.service.ReelService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    private int safeSize(int size) {
        return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
