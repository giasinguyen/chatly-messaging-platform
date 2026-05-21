package com.chatly.controller;

import com.chatly.dto.request.CreatePostRequest;
import com.chatly.dto.request.CreatePostCommentRequest;
import com.chatly.dto.request.ReactToPostRequest;
import com.chatly.dto.request.UpdatePostRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.PostCommentResponse;
import com.chatly.dto.response.PostResponse;
import com.chatly.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping("/search")
    ApiResponse<Page<PostResponse>> searchPosts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String hashtag,
            Pageable pageable) {
        return ApiResponse.<Page<PostResponse>>builder()
                .result(postService.searchPosts(q, hashtag, getAuthenticatedUserId(), pageable))
                .build();
    }

        @GetMapping("/hashtags/trending")
        ApiResponse<List<String>> getTrendingHashtags(
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.<List<String>>builder()
            .result(postService.getTrendingHashtags(limit))
            .build();
        }

    @GetMapping("/feed")
    ApiResponse<Page<PostResponse>> getFeed(Pageable pageable) {
        return ApiResponse.<Page<PostResponse>>builder()
                .result(postService.getFeed(getAuthenticatedUserId(), pageable))
                .build();
    }

    @GetMapping("/saved")
    ApiResponse<Page<PostResponse>> getSaved(Pageable pageable) {
        return ApiResponse.<Page<PostResponse>>builder()
                .result(postService.getSaved(getAuthenticatedUserId(), pageable))
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

    @PutMapping("/{postId}/save")
    ApiResponse<Void> save(@PathVariable String postId) {
        postService.save(postId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    @DeleteMapping("/{postId}/save")
    ApiResponse<Void> unsave(@PathVariable String postId) {
        postService.unsave(postId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/{postId}/share")
    ApiResponse<PostResponse> share(@PathVariable String postId) {
        return ApiResponse.<PostResponse>builder()
                .result(postService.share(postId, getAuthenticatedUserId()))
                .build();
    }

    @GetMapping("/{postId}/comments")
    ApiResponse<List<PostCommentResponse>> getComments(@PathVariable String postId) {
        return ApiResponse.<List<PostCommentResponse>>builder()
                .result(postService.getComments(postId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{postId}/comments")
    ApiResponse<PostCommentResponse> addComment(
            @PathVariable String postId,
            @RequestBody @Valid CreatePostCommentRequest request) {
        return ApiResponse.<PostCommentResponse>builder()
                .result(postService.addComment(postId, getAuthenticatedUserId(), request))
                .build();
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

    @PatchMapping("/{postId}/comments/{commentId}")
    ApiResponse<PostCommentResponse> editComment(
            @PathVariable String postId,
            @PathVariable String commentId,
            @RequestBody @Valid CreatePostCommentRequest request) {
        return ApiResponse.<PostCommentResponse>builder()
                .result(postService.editComment(postId, commentId, getAuthenticatedUserId(), request))
                .build();
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    ApiResponse<Void> deleteComment(
            @PathVariable String postId,
            @PathVariable String commentId) {
        postService.deleteComment(postId, commentId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().build();
    }

    @PutMapping("/{postId}/comments/{commentId}/reactions")
    ApiResponse<PostCommentResponse> reactToComment(
            @PathVariable String postId,
            @PathVariable String commentId,
            @RequestBody @Valid ReactToPostRequest request) {
        return ApiResponse.<PostCommentResponse>builder()
                .result(postService.reactToComment(postId, commentId, getAuthenticatedUserId(), request))
                .build();
    }

    @DeleteMapping("/{postId}/comments/{commentId}/reactions")
    ApiResponse<PostCommentResponse> removeCommentReaction(
            @PathVariable String postId,
            @PathVariable String commentId) {
        return ApiResponse.<PostCommentResponse>builder()
                .result(postService.removeCommentReaction(postId, commentId, getAuthenticatedUserId()))
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
