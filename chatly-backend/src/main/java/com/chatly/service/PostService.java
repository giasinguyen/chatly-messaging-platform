package com.chatly.service;

import com.chatly.dto.request.CreatePostRequest;
import com.chatly.dto.request.ReactToPostRequest;
import com.chatly.dto.request.UpdatePostRequest;
import com.chatly.dto.response.PostReactionSummary;
import com.chatly.dto.response.PostResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.PostMapper;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.enums.ReactionType;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostReaction;
import com.chatly.repository.mongo.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostService {

    private static final Pattern HASHTAG_PATTERN = Pattern.compile("#(\\w+)");

    private final PostRepository postRepository;
    private final PostMapper postMapper;

    public PostResponse create(String authorId, CreatePostRequest request) {
        List<String> hashtags = extractHashtags(request.getContent());
        PostVisibility visibility = request.getVisibility() != null
                ? request.getVisibility()
                : PostVisibility.PUBLIC;

        Post post = Post.builder()
                .authorId(authorId)
                .content(request.getContent())
                .mediaUrls(request.getMediaUrls() != null ? request.getMediaUrls() : new ArrayList<>())
                .visibility(visibility)
                .hashtags(hashtags)
                .build();

        post = postRepository.save(post);
        log.info("Post created: id={}, authorId={}", post.getId(), authorId);
        return toResponse(post, authorId);
    }

    public Page<PostResponse> getFeed(String requesterId, Pageable pageable) {
        return postRepository
                .findByVisibilityOrderByCreatedAtDesc(PostVisibility.PUBLIC, pageable)
                .map(post -> toResponse(post, requesterId));
    }

    public Page<PostResponse> getByAuthor(String authorId, String requesterId, Pageable pageable) {
        return postRepository
                .findByAuthorIdOrderByCreatedAtDesc(authorId, pageable)
                .map(post -> toResponse(post, requesterId));
    }

    public PostResponse getById(String postId, String requesterId) {
        Post post = findPost(postId);
        return toResponse(post, requesterId);
    }

    public PostResponse update(String postId, String requesterId, UpdatePostRequest request) {
        Post post = findPost(postId);
        assertOwner(post, requesterId);

        if (request.getContent() != null) {
            post.setContent(request.getContent());
            post.setHashtags(extractHashtags(request.getContent()));
        }
        if (request.getVisibility() != null) {
            post.setVisibility(request.getVisibility());
        }

        post = postRepository.save(post);
        log.info("Post updated: id={}", postId);
        return toResponse(post, requesterId);
    }

    public void delete(String postId, String requesterId) {
        Post post = findPost(postId);
        assertOwner(post, requesterId);
        postRepository.delete(post);
        log.info("Post deleted: id={}, by={}", postId, requesterId);
    }

    public PostResponse react(String postId, String userId, ReactToPostRequest request) {
        Post post = findPost(postId);

        // Replace any existing reaction from this user
        List<PostReaction> reactions = new ArrayList<>(post.getReactions());
        reactions.removeIf(r -> r.getUserId().equals(userId));
        reactions.add(PostReaction.builder()
                .userId(userId)
                .type(request.getType())
                .createdAt(Instant.now())
                .build());

        post.setReactions(reactions);
        post = postRepository.save(post);
        return toResponse(post, userId);
    }

    public PostResponse removeReaction(String postId, String userId) {
        Post post = findPost(postId);
        post.getReactions().removeIf(r -> r.getUserId().equals(userId));
        post = postRepository.save(post);
        return toResponse(post, userId);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private Post findPost(String postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.POST_NOT_FOUND));
    }

    private void assertOwner(Post post, String userId) {
        if (!post.getAuthorId().equals(userId)) {
            throw new AppException(ErrorCode.POST_FORBIDDEN);
        }
    }

    private List<String> extractHashtags(String content) {
        Matcher matcher = HASHTAG_PATTERN.matcher(content);
        List<String> tags = new ArrayList<>();
        while (matcher.find()) {
            tags.add(matcher.group(1).toLowerCase());
        }
        return tags;
    }

    private PostResponse toResponse(Post post, String requesterId) {
        PostResponse response = postMapper.toResponse(post);
        response.setReactions(buildReactionSummary(post, requesterId));
        return response;
    }

    private List<PostReactionSummary> buildReactionSummary(Post post, String requesterId) {
        Map<ReactionType, Long> counts = post.getReactions().stream()
                .collect(Collectors.groupingBy(PostReaction::getType, Collectors.counting()));

        ReactionType myType = post.getReactions().stream()
                .filter(r -> r.getUserId().equals(requesterId))
                .map(PostReaction::getType)
                .findFirst()
                .orElse(null);

        return Arrays.stream(ReactionType.values())
                .filter(counts::containsKey)
                .map(type -> PostReactionSummary.builder()
                        .type(type)
                        .count(counts.get(type))
                        .reactedByMe(type == myType)
                        .build())
                .collect(Collectors.toList());
    }
}
