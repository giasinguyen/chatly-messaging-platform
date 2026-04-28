package com.chatly.controller;

import com.chatly.dto.request.CreatePostRequest;
import com.chatly.dto.request.ReactToPostRequest;
import com.chatly.dto.request.UpdatePostRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.PostResponse;
import com.chatly.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping
    ApiResponse<PostResponse> create(@RequestBody @Valid CreatePostRequest request) {
        return ApiResponse.<PostResponse>builder()
                .result(postService.create(getAuthenticatedUserId(), request))
                .build();
    }

    @GetMapping("/feed")
    ApiResponse<Page<PostResponse>> getFeed(Pageable pageable) {
        return ApiResponse.<Page<PostResponse>>builder()
                .result(postService.getFeed(getAuthenticatedUserId(), pageable))
                .build();
    }

    @GetMapping("/users/{authorId}")
    ApiResponse<Page<PostResponse>> getByAuthor(@PathVariable String authorId, Pageable pageable) {
        return ApiResponse.<Page<PostResponse>>builder()
                .result(postService.getByAuthor(authorId, getAuthenticatedUserId(), pageable))
                .build();
    }

    @GetMapping("/{postId}")
    ApiResponse<PostResponse> getById(@PathVariable String postId) {
        return ApiResponse.<PostResponse>builder()
                .result(postService.getById(postId, getAuthenticatedUserId()))
                .build();
    }

    @PatchMapping("/{postId}")
    ApiResponse<PostResponse> update(
            @PathVariable String postId,
            @RequestBody @Valid UpdatePostRequest request) {
        return ApiResponse.<PostResponse>builder()
                .result(postService.update(postId, getAuthenticatedUserId(), request))
                .build();
    }

    @DeleteMapping("/{postId}")
    ApiResponse<Void> delete(@PathVariable String postId) {
        postService.delete(postId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    @PutMapping("/{postId}/reactions")
    ApiResponse<PostResponse> react(
            @PathVariable String postId,
            @RequestBody @Valid ReactToPostRequest request) {
        return ApiResponse.<PostResponse>builder()
                .result(postService.react(postId, getAuthenticatedUserId(), request))
                .build();
    }

    @DeleteMapping("/{postId}/reactions")
    ApiResponse<PostResponse> removeReaction(@PathVariable String postId) {
        return ApiResponse.<PostResponse>builder()
                .result(postService.removeReaction(postId, getAuthenticatedUserId()))
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
