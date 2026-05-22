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
import com.chatly.proxy.AgentProxyClient;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.mongo.SavedPostRepository;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.FollowRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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

    private static final Pattern HASHTAG_PATTERN = Pattern.compile(
            "#(?=[\\p{L}\\p{N}_]*\\p{L})([\\p{L}\\p{N}_]+)"
    );
    private static final Pattern AI_MENTION_PATTERN = Pattern.compile("(?i)@ai\\b");
    private static final String FEED_TOPIC_PREFIX = "/topic/feed/";
    private static final int DEFAULT_TRENDING_HASHTAG_LIMIT = 10;
    private static final int MIN_TRENDING_HASHTAG_LIMIT = 1;
    private static final int MAX_TRENDING_HASHTAG_LIMIT = 50;
    private static final int POST_AI_CONTEXT_COMMENT_LIMIT = 5;
    private static final int POST_CONTENT_SNIPPET_MAX_LENGTH = 300;

    private final PostRepository postRepository;
    private final PostMapper postMapper;
    private final UserRepository userRepository;
    private final SavedPostRepository savedPostRepository;
    private final ContactRepository contactRepository;
    private final FollowRepository followRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final AgentProxyClient agentProxyClient;
    private final SocialAiRateLimiter socialAiRateLimiter;

    @Value("${app.social-ai.enabled:true}")
    private boolean socialAiEnabled;

    @Value("${app.social-ai.bot-user-id:00000000-0000-0000-0000-000000000001}")
    private String aiBotUserId;

    public PostResponse create(String authorId, CreatePostRequest request) {
        List<String> mediaUrls = request.getMediaUrls() != null ? request.getMediaUrls() : new ArrayList<>();

        List<String> hashtags = extractHashtags(request.getContent());

        PostVisibility visibility = request.getVisibility() != null
                ? request.getVisibility()
                : PostVisibility.PUBLIC;

        Post post = Post.builder()
                .authorId(authorId)
                .content(request.getContent())
                .mediaUrls(mediaUrls)
                .visibility(visibility)
                .hashtags(hashtags)
                .build();

        post = postRepository.save(post);
        log.info("Post created: id={}, authorId={}", post.getId(), authorId);

        User author = safeUuid(authorId)
            .flatMap(userRepository::findById)
            .orElse(null);
        String authorName = author != null ? author.getDisplayName() : "Someone";
        notifyMentionedUsers(
            NotificationType.POST_MENTION,
            authorId,
            request.getMentionIds(),
            authorName + " mentioned you in a post",
            post.getId()
        );

        broadcastNewPost(post);
        triggerSocialPostCommandIfNeeded(post, authorId, null);
        return toResponse(post, authorId);
    }

    public Page<PostResponse> getFeed(String requesterId, Pageable pageable) {
        Page<Post> page = postRepository
                .findByVisibilityAndIsDeletedFalseOrderByCreatedAtDesc(PostVisibility.PUBLIC, pageable);
        return toBatchedResponsePage(page, requesterId);
    }

    public Page<PostResponse> searchPosts(String keyword, String hashtag, String requesterId, Pageable pageable) {
        Page<Post> page = postRepository.searchPublicPosts(keyword, hashtag, pageable);
        return toBatchedResponsePage(page, requesterId);
    }

    public List<String> getTrendingHashtags(Integer limit) {
        int requested = limit == null ? DEFAULT_TRENDING_HASHTAG_LIMIT : limit;
        int safeLimit = Math.max(MIN_TRENDING_HASHTAG_LIMIT, Math.min(requested, MAX_TRENDING_HASHTAG_LIMIT));
        return postRepository.findTrendingHashtags(safeLimit);
    }

    public Page<PostResponse> getByAuthor(String authorId, String requesterId, Pageable pageable) {
        Page<Post> page = postRepository
                .findByAuthorIdAndIsDeletedFalseOrderByCreatedAtDesc(authorId, pageable);
        return toBatchedResponsePage(page, requesterId);
    }

    public Page<PostResponse> getSaved(String requesterId, Pageable pageable) {
        List<SavedPost> savedPosts = savedPostRepository.findByUserIdOrderByCreatedAtDesc(requesterId);
        List<String> postIds = savedPosts.stream()
                .map(SavedPost::getPostId)
                .toList();

        if (postIds.isEmpty()) {
            return Page.empty(pageable);
        }

        Map<String, Post> postsById = new HashMap<>();
        postRepository.findAllById(postIds).forEach(post -> postsById.put(post.getId(), post));

        List<PostResponse> validResponses = new ArrayList<>();
        for (SavedPost savedPost : savedPosts) {
            Post post = postsById.get(savedPost.getPostId());
            if (post == null || post.isDeleted()) {
                savedPostRepository.deleteByUserIdAndPostId(requesterId, savedPost.getPostId());
                continue;
            }
            validResponses.add(toResponse(post, requesterId));
        }

        if (pageable.isUnpaged()) {
            return new PageImpl<>(validResponses);
        }

        int start = Math.toIntExact(Math.min(pageable.getOffset(), validResponses.size()));
        int end = Math.min(start + pageable.getPageSize(), validResponses.size());
        return new PageImpl<>(validResponses.subList(start, end), pageable, validResponses.size());
    }

    public PostResponse getById(String postId, String requesterId) {
        Post post = findPost(postId);
        return toResponse(post, requesterId);
    }

    public PostResponse update(String postId, String requesterId, UpdatePostRequest request) {
        Post post = findPost(postId);
        assertOwner(post, requesterId);
        String previousContent = post.getContent();

        if (request.getContent() != null) {
            post.setContent(request.getContent());
            post.setHashtags(extractHashtags(request.getContent()));
        }
        if (request.getMediaUrls() != null) {
            post.setMediaUrls(new ArrayList<>(request.getMediaUrls()));
        }
        if (request.getVisibility() != null) {
            post.setVisibility(request.getVisibility());
        }

        post = postRepository.save(post);
        log.info("Post updated: id={}", postId);
        User author = safeUuid(requesterId)
                .flatMap(userRepository::findById)
                .orElse(null);
        String authorName = author != null ? author.getDisplayName() : "Someone";
        notifyMentionedUsers(
                NotificationType.POST_MENTION,
                requesterId,
                request.getMentionIds(),
                authorName + " mentioned you in a post",
                post.getId()
        );
        triggerSocialPostCommandIfNeeded(post, requesterId, previousContent);
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

        if (socialAiEnabled && containsAiMention(content)) {
            if (socialAiRateLimiter.tryConsume(userId)) {
                String postContext = buildPostContextForAi(post);
                String threadContext = parentCommentId != null ? buildThreadContext(post, parentCommentId) : "";
                agentProxyClient.triggerSocialMentionCommentAsync(
                        post.getId(), comment.getId(), userId, content, postContext, threadContext);
            } else {
                log.warn("Social AI rate limit exceeded for userId={} on postId={}", userId, postId);
            }
        }

            String commenterName = commenter != null ? commenter.getDisplayName() : "Someone";
            notifyMentionedUsers(
                NotificationType.POST_MENTION,
                userId,
                request.getMentionIds(),
                commenterName + " mentioned you in a comment",
                postId + "_" + comment.getId()
            );

        return toCommentResponse(comment, commenter, userId);
    }

    public PostCommentResponse addAiComment(String postId, String content, String parentCommentId, String triggerType) {
        Post post = findPost(postId);

        if (content == null || content.isBlank()) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
        if (parentCommentId != null && post.getComments().stream().noneMatch(c -> c.getId().equals(parentCommentId))) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        PostComment comment = PostComment.builder()
                .id(UUID.randomUUID().toString())
                .userId(aiBotUserId)
                .content(content)
                .createdAt(Instant.now())
                .parentCommentId(parentCommentId)
                .isAiGenerated(true)
                .triggerType(triggerType)
                .build();

        List<PostComment> comments = new ArrayList<>(post.getComments());
        comments.add(comment);
        post.setComments(comments);
        post.setCommentCount(comments.size());
        postRepository.save(post);

        log.info("AI comment added: postId={} commentId={} triggerType={}", postId, comment.getId(), triggerType);
        return toCommentResponse(comment, null, aiBotUserId);
    }

    public String buildPostContextForAi(String postId) {
        return buildPostContextForAi(findPost(postId));
    }

    public String buildPostCommentsContextForAi(String postId) {
        Post post = findPost(postId);
        if (post.getComments().isEmpty()) {
            return "No comments yet.";
        }
        StringBuilder sb = new StringBuilder();
        post.getComments().stream()
                .sorted(Comparator.comparing(PostComment::getCreatedAt).reversed())
                .limit(POST_AI_CONTEXT_COMMENT_LIMIT)
                .forEach(c -> sb.append("[user:").append(c.getUserId()).append("] ").append(c.getContent()).append("\n"));
        return sb.toString().trim();
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

    private void broadcastNewPost(Post post) {
        if (!shouldBroadcast(post.getVisibility())) {
            return;
        }

        Set<String> recipientIds = findRealtimeFeedRecipientIds(post.getAuthorId());
        recipientIds.forEach(recipientId -> sendFeedUpdate(post, recipientId));

        if (!recipientIds.isEmpty()) {
            log.info("Post broadcast: id={}, recipients={}", post.getId(), recipientIds.size());
        }
    }

    private void sendFeedUpdate(Post post, String recipientId) {
        try {
            messagingTemplate.convertAndSend(FEED_TOPIC_PREFIX + recipientId, toResponse(post, recipientId));
        } catch (RuntimeException ex) {
            log.warn("Post broadcast failed: id={}, recipientId={}", post.getId(), recipientId, ex);
        }
    }

    private boolean shouldBroadcast(PostVisibility visibility) {
        return visibility == PostVisibility.PUBLIC || visibility == PostVisibility.FRIENDS_ONLY;
    }

    private Set<String> findRealtimeFeedRecipientIds(String authorId) {
        Optional<UUID> authorUuid = safeUuid(authorId);
        if (authorUuid.isEmpty()) {
            return Collections.emptySet();
        }

        Set<String> recipientIds = new LinkedHashSet<>();
        followRepository.findFollowerIdsByFolloweeId(authorUuid.get(), Pageable.unpaged())
                .forEach(followerId -> recipientIds.add(followerId.toString()));
        recipientIds.addAll(contactRepository.findFollowingIds(authorUuid.get()));
        recipientIds.remove(authorId);
        return recipientIds;
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

    private Page<PostResponse> toBatchedResponsePage(Page<Post> page, String requesterId) {
        List<Post> posts = page.getContent();
        Map<String, User> authors = loadUsersForPosts(posts);
        List<String> savedIds = loadSavedPostIds(requesterId, posts);

        List<PostResponse> responses = posts.stream().map(post -> {
            PostResponse response = postMapper.toResponse(post);
            response.setReactions(buildReactionSummary(post, requesterId));
            response.setSavedByMe(savedIds.contains(post.getId()));
            User author = authors.get(post.getAuthorId());
            if (author != null) {
                response.setAuthorUsername(author.getUsername());
                response.setAuthorDisplayName(author.getDisplayName());
                response.setAuthorAvatarUrl(author.getAvatarUrl());
            }
            return response;
        }).toList();

        return new PageImpl<>(responses, page.getPageable(), page.getTotalElements());
    }

    private Map<String, User> loadUsersForPosts(List<Post> posts) {
        List<UUID> authorUuids = posts.stream()
                .map(Post::getAuthorId)
                .distinct()
                .map(this::safeUuid)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();
        if (authorUuids.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(authorUuids).stream()
                .collect(Collectors.toMap(u -> u.getId().toString(), u -> u));
    }

    private List<String> loadSavedPostIds(String userId, List<Post> posts) {
        List<String> postIds = posts.stream().map(Post::getId).toList();
        if (postIds.isEmpty()) return Collections.emptyList();
        return savedPostRepository.findByUserIdAndPostIdIn(userId, postIds).stream()
                .map(SavedPost::getPostId)
                .toList();
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

    private void notifyMentionedUsers(
            NotificationType notificationType,
            String actorId,
            List<String> mentionIds,
            String message,
            String referenceId
    ) {
        if (mentionIds == null || mentionIds.isEmpty()) {
            return;
        }

        LinkedHashSet<String> targetUserIds = mentionIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .filter(value -> !value.equals(actorId))
                .filter(value -> !value.equals(aiBotUserId))
                .filter(value -> safeUuid(value).isPresent())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        targetUserIds.forEach(targetUserId -> notificationService.createAndPush(
                notificationType,
                actorId,
                targetUserId,
                message,
                referenceId
        ));
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
        String displayName = comment.isAiGenerated() ? "Chatly AI" : (user != null ? user.getDisplayName() : comment.getUserId());
        return PostCommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .userUsername(user != null ? user.getUsername() : null)
                .userDisplayName(displayName)
                .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .parentCommentId(comment.getParentCommentId())
                .mediaUrls(comment.getMediaUrls() != null ? comment.getMediaUrls() : List.of())
                .reactions(buildCommentReactionSummary(comment, null))
                .isAiGenerated(comment.isAiGenerated() ? Boolean.TRUE : null)
                .triggerType(comment.getTriggerType())
                .build();
    }

    private PostCommentResponse toCommentResponse(PostComment comment, User user, String requesterId) {
        String displayName = comment.isAiGenerated() ? "Chatly AI" : (user != null ? user.getDisplayName() : comment.getUserId());
        return PostCommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUserId())
                .userUsername(user != null ? user.getUsername() : null)
                .userDisplayName(displayName)
                .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .parentCommentId(comment.getParentCommentId())
                .mediaUrls(comment.getMediaUrls() != null ? comment.getMediaUrls() : List.of())
                .reactions(buildCommentReactionSummary(comment, requesterId))
                .isAiGenerated(comment.isAiGenerated() ? Boolean.TRUE : null)
                .triggerType(comment.getTriggerType())
                .build();
    }

    private String buildPostContextForAi(Post post) {
        StringBuilder sb = new StringBuilder();
        if (post.getContent() != null && !post.getContent().isBlank()) {
            String snippet = post.getContent().length() > POST_CONTENT_SNIPPET_MAX_LENGTH
                    ? post.getContent().substring(0, POST_CONTENT_SNIPPET_MAX_LENGTH) + "..."
                    : post.getContent();
            sb.append(snippet);
        }
        if (!post.getHashtags().isEmpty()) {
            sb.append(" ").append(post.getHashtags().stream()
                    .map(t -> "#" + t).collect(Collectors.joining(" ")));
        }
        return sb.toString().trim();
    }

    private boolean containsAiMention(String content) {
        if (content == null || content.isBlank()) return false;
        return AI_MENTION_PATTERN.matcher(content).find();
    }

    private void triggerSocialPostCommandIfNeeded(Post post, String userId, String previousContent) {
        if (!socialAiEnabled || post.getContent() == null || !containsAiMention(post.getContent())) {
            return;
        }

        boolean hadAiMentionBefore = previousContent != null && containsAiMention(previousContent);
        if (hadAiMentionBefore) {
            return;
        }

        String postContext = buildPostContextForAi(post);
        agentProxyClient.triggerSocialPostCommandAsync(
                post.getId(),
                userId,
                post.getContent(),
                postContext,
                ""
        );
        log.info("Social post command trigger queued: postId={} userId={}", post.getId(), userId);
    }

    private String buildThreadContext(Post post, String parentCommentId) {
        return post.getComments().stream()
                .filter(c -> c.getId().equals(parentCommentId))
                .findFirst()
                .map(PostComment::getContent)
                .orElse("");
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
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.COMMENT_FORBIDDEN);
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
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.COMMENT_FORBIDDEN);
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
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

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
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

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
