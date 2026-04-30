package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.FeedResponse;
import com.chatly.service.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE     = 50;

    private final FeedService feedService;

    /** Home feed: posts from followed users, newest first, cursor-based. */
    @GetMapping("/home")
    ApiResponse<FeedResponse> getHomeFeed(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(size, MAX_PAGE_SIZE);
        return ApiResponse.<FeedResponse>builder()
                .result(feedService.getHomeFeed(getAuthenticatedUserId(), cursor, safeSize))
                .build();
    }

    /** User feed: public (and followers-only when requester follows) posts by a specific user. */
    @GetMapping("/user/{userId}")
    ApiResponse<FeedResponse> getUserFeed(
            @PathVariable String userId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(size, MAX_PAGE_SIZE);
        return ApiResponse.<FeedResponse>builder()
                .result(feedService.getUserFeed(userId, getAuthenticatedUserId(), cursor, safeSize))
                .build();
    }

    /** Explore feed: recent PUBLIC posts sorted by engagement score (7-day window). */
    @GetMapping("/explore")
    ApiResponse<FeedResponse> getExploreFeed(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(size, MAX_PAGE_SIZE);
        return ApiResponse.<FeedResponse>builder()
                .result(feedService.getExploreFeed(getAuthenticatedUserId(), cursor, safeSize))
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
