package com.chatly.controller;

import com.chatly.dto.request.StoryCreationRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.StoryResponse;
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

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
