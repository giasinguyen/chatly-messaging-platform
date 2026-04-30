package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.PagedResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/follows/{userId}")
    ApiResponse<Void> follow(@PathVariable String userId) {
        followService.follow(getAuthenticatedUserId(), userId);
        return ApiResponse.<Void>builder().build();
    }

    @DeleteMapping("/follows/{userId}")
    ApiResponse<Void> unfollow(@PathVariable String userId) {
        followService.unfollow(getAuthenticatedUserId(), userId);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/users/{userId}/followers")
    ApiResponse<PagedResponse<UserResponse>> getFollowers(@PathVariable String userId, Pageable pageable) {
        return ApiResponse.<PagedResponse<UserResponse>>builder()
                .result(followService.getFollowers(userId, pageable))
                .build();
    }

    @GetMapping("/users/{userId}/following")
    ApiResponse<PagedResponse<UserResponse>> getFollowing(@PathVariable String userId, Pageable pageable) {
        return ApiResponse.<PagedResponse<UserResponse>>builder()
                .result(followService.getFollowing(userId, pageable))
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
