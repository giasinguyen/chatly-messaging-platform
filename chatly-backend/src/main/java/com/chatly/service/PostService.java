package com.chatly.service;

import com.chatly.dto.request.CreatePostRequest;
import com.chatly.dto.request.CreatePostCommentRequest;
import com.chatly.dto.request.ReactToPostRequest;
import com.chatly.dto.request.UpdatePostRequest;
import com.chatly.dto.response.PostCommentResponse;
import com.chatly.dto.response.PostReactionSummary;
import com.chatly.dto.response.PostResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.PostMapper;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.enums.ReactionType;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostComment;
import com.chatly.model.mongo.PostReaction;
import com.chatly.model.mongo.SavedPost;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.mongo.SavedPostRepository;
import com.chatly.repository.postgres.UserRepository;
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
    private final UserRepository userRepository;
    private final SavedPostRepository savedPostRepository;
    private final NotificationService notificationService;

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

    public Page<PostResponse> searchPosts(String keyword, String hashtag, String requesterId, Pageable pageable) {
        return postRepository
                .searchPublicPosts(keyword, hashtag, pageable)
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

    public void save(String postId, String requesterId) {
        findPost(postId);

        if (savedPostRepository.existsByUserIdAndPostId(requesterId, postId)) {
            return;
        }

        SavedPost savedPost = SavedPost.builder()
                .userId(requesterId)
                .postId(postId)
                .build();
        savedPostRepository.save(savedPost);
    }

    public void unsave(String postId, String requesterId) {
        savedPostRepository.deleteByUserIdAndPostId(requesterId, postId);
    }

    public PostResponse share(String postId, String requesterId) {
        Post post = findPost(postId);
        post.setShareCount(post.getShareCount() + 1);
        post = postRepository.save(post);

        if (!post.getAuthorId().equals(requesterId)) {
            notificationService.createAndPush(
                    NotificationType.POST_SHARED,
                    requesterId,
                    post.getAuthorId(),
                    "Someone shared your post",
                    postId
            );
        }

        return toResponse(post, requesterId);
    }

    public List<PostCommentResponse> getComments(String postId, String requesterId) {
        Post post = findPost(postId);
        if (post.getComments().isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, User> usersById = loadUsersById(
                post.getComments().stream().map(PostComment::getUserId).distinct().toList()
        );

        return post.getComments().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(comment -> toCommentResponse(comment, usersById.get(comment.getUserId()), requesterId))
                .toList();
    }

    public PostCommentResponse addComment(String postId, String userId, CreatePostCommentRequest request) {
        Post post = findPost(postId);

        String content = request.getContent() != null ? request.getContent().trim() : "";
        List<String> mediaUrls = request.getMediaUrls() != null ? new ArrayList<>(request.getMediaUrls()) : new ArrayList<>();
        String parentCommentId = request.getParentCommentId() != null && !request.getParentCommentId().isBlank()
                ? request.getParentCommentId().trim()
                : null;

        if (content.isBlank() && mediaUrls.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        if (parentCommentId != null && post.getComments().stream().noneMatch(comment -> comment.getId().equals(parentCommentId))) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        PostComment comment = PostComment.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .content(content)
                .createdAt(Instant.now())
                .parentCommentId(parentCommentId)
                .mediaUrls(mediaUrls)
                .build();

        List<PostComment> comments = new ArrayList<>(post.getComments());
        comments.add(comment);
        post.setComments(comments);
        post.setCommentCount(comments.size());
        postRepository.save(post);

        User commenter = safeUuid(userId)
                .flatMap(userRepository::findById)
                .orElse(null);

        // Send notification
        if (!userId.equals(post.getAuthorId())) {
            User commenterUser = commenter;
            String commenterName = commenterUser != null ? commenterUser.getDisplayName() : "Someone";

            if (parentCommentId != null) {
                // Reply to a comment - notify the parent comment author
                PostComment parentComment = post.getComments().stream()
                        .filter(c -> c.getId().equals(parentCommentId))
                        .findFirst()
                        .orElse(null);

                if (parentComment != null && !parentComment.getUserId().equals(userId)) {
                    notificationService.createAndPush(
                            NotificationType.COMMENT_REPLIED,
                            userId,
                            parentComment.getUserId(),
                            commenterName + " replied to your comment",
                            postId + "_" + parentCommentId
                    );
                }
            } else {
                // New comment on post - notify the post author
                notificationService.createAndPush(
                        NotificationType.POST_COMMENTED,
                        userId,
                        post.getAuthorId(),
                        commenterName + " commented on your post",
                        postId
                );
            }
        }

        return toCommentResponse(comment, commenter, userId);
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

        // Send notification to post author
        if (!userId.equals(post.getAuthorId())) {
            User liker = safeUuid(userId)
                    .flatMap(userRepository::findById)
                    .orElse(null);
            String likerName = liker != null ? liker.getDisplayName() : "Someone";
            notificationService.createAndPush(
                    NotificationType.POST_LIKED,
                    userId,
                    post.getAuthorId(),
                    likerName + " liked your post",
                    postId
            );
        }

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
        applyAuthor(response, post.getAuthorId());
        response.setSavedByMe(savedPostRepository.existsByUserIdAndPostId(requesterId, post.getId()));
        return response;
    }

    private void applyAuthor(PostResponse response, String authorId) {
        Optional<UUID> authorUuid = safeUuid(authorId);
        if (authorUuid.isEmpty()) {
            return;
        }

        userRepository.findById(authorUuid.get()).ifPresent(user -> {
            response.setAuthorUsername(user.getUsername());
            response.setAuthorDisplayName(user.getDisplayName());
            response.setAuthorAvatarUrl(user.getAvatarUrl());
        });
    }

    private Optional<UUID> safeUuid(String value) {
        try {
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private Map<String, User> loadUsersById(List<String> userIds) {
        List<UUID> uuids = userIds.stream()
                .map(this::safeUuid)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();

        if (uuids.isEmpty()) {
            return Collections.emptyMap();
        }

        return userRepository.findAllById(uuids).stream()
                .collect(Collectors.toMap(user -> user.getId().toString(), user -> user));
    }

    private PostCommentResponse toCommentResponse(PostComment comment, User user) {
        return PostCommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .userUsername(user != null ? user.getUsername() : null)
                .userDisplayName(user != null ? user.getDisplayName() : comment.getUserId())
                .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .parentCommentId(comment.getParentCommentId())
                .mediaUrls(comment.getMediaUrls() != null ? comment.getMediaUrls() : List.of())
                .reactions(buildCommentReactionSummary(comment, null))
                .build();
    }

    private PostCommentResponse toCommentResponse(PostComment comment, User user, String requesterId) {
        return PostCommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .userUsername(user != null ? user.getUsername() : null)
                .userDisplayName(user != null ? user.getDisplayName() : comment.getUserId())
                .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .parentCommentId(comment.getParentCommentId())
                .mediaUrls(comment.getMediaUrls() != null ? comment.getMediaUrls() : List.of())
                .reactions(buildCommentReactionSummary(comment, requesterId))
                .build();
    }

    private List<PostReactionSummary> buildCommentReactionSummary(PostComment comment, String requesterId) {
        if (comment.getReactions() == null || comment.getReactions().isEmpty()) {
            return List.of();
        }

        Map<ReactionType, Long> counts = comment.getReactions().stream()
                .collect(Collectors.groupingBy(PostReaction::getType, Collectors.counting()));

        ReactionType myType = requesterId != null ? comment.getReactions().stream()
                .filter(r -> r.getUserId().equals(requesterId))
                .map(PostReaction::getType)
                .findFirst()
                .orElse(null) : null;

        return Arrays.stream(ReactionType.values())
                .filter(counts::containsKey)
                .map(type -> PostReactionSummary.builder()
                        .type(type)
                        .count(counts.get(type))
                        .reactedByMe(type == myType)
                        .build())
                .collect(Collectors.toList());
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

    public PostCommentResponse editComment(String postId, String commentId, String userId, CreatePostCommentRequest request) {
        Post post = findPost(postId);
        PostComment comment = post.getComments().stream()
                .filter(c -> c.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized to edit this comment");
        }

        comment.setContent(request.getContent().trim());
        comment.setUpdatedAt(Instant.now());
        postRepository.save(post);

        User commenter = safeUuid(userId)
                .flatMap(userRepository::findById)
                .orElse(null);
        return toCommentResponse(comment, commenter);
    }

    public void deleteComment(String postId, String commentId, String userId) {
        Post post = findPost(postId);
        PostComment comment = post.getComments().stream()
                .filter(c -> c.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized to delete this comment");
        }

        Set<String> commentIdsToRemove = new HashSet<>();
        commentIdsToRemove.add(commentId);
        boolean changed;
        do {
            changed = false;
            for (PostComment current : post.getComments()) {
                if (current.getParentCommentId() != null
                        && commentIdsToRemove.contains(current.getParentCommentId())
                        && commentIdsToRemove.add(current.getId())) {
                    changed = true;
                }
            }
        } while (changed);

        List<PostComment> comments = post.getComments().stream()
                .filter(current -> !commentIdsToRemove.contains(current.getId()))
                .collect(Collectors.toCollection(ArrayList::new));
        post.setComments(comments);
        post.setCommentCount(comments.size());
        postRepository.save(post);
    }

    public PostCommentResponse reactToComment(String postId, String commentId, String userId, ReactToPostRequest request) {
        Post post = findPost(postId);
        PostComment comment = post.getComments().stream()
                .filter(c -> c.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        // Replace any existing reaction from this user
        List<PostReaction> reactions = new ArrayList<>(comment.getReactions());
        reactions.removeIf(r -> r.getUserId().equals(userId));
        reactions.add(PostReaction.builder()
                .userId(userId)
                .type(request.getType())
                .createdAt(Instant.now())
                .build());
        comment.setReactions(reactions);
        postRepository.save(post);

        // Send notification to comment author
        if (!userId.equals(comment.getUserId())) {
            User liker = safeUuid(userId)
                    .flatMap(userRepository::findById)
                    .orElse(null);
            String likerName = liker != null ? liker.getDisplayName() : "Someone";
            notificationService.createAndPush(
                    NotificationType.POST_LIKED,
                    userId,
                    comment.getUserId(),
                    likerName + " liked your comment",
                    postId + "_" + commentId
            );
        }

        User commenter = safeUuid(comment.getUserId())
                .flatMap(userRepository::findById)
                .orElse(null);
        return toCommentResponse(comment, commenter, userId);
    }

    public PostCommentResponse removeCommentReaction(String postId, String commentId, String userId) {
        Post post = findPost(postId);
        PostComment comment = post.getComments().stream()
                .filter(c -> c.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        List<PostReaction> reactions = new ArrayList<>(comment.getReactions());
        reactions.removeIf(r -> r.getUserId().equals(userId));
        comment.setReactions(reactions);
        postRepository.save(post);

        User commenter = safeUuid(comment.getUserId())
                .flatMap(userRepository::findById)
                .orElse(null);
        return toCommentResponse(comment, commenter, userId);
    }
}
