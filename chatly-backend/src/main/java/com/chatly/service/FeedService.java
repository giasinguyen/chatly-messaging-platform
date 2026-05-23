package com.chatly.service;

import com.chatly.dto.response.FeedResponse;
import com.chatly.dto.response.PostReactionSummary;
import com.chatly.dto.response.PostResponse;
import com.chatly.mapper.PostMapper;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.enums.ReactionType;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostReaction;
import com.chatly.model.mongo.SavedPost;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.mongo.SavedPostRepository;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedService {

    private static final int EXPLORE_WINDOW_DAYS = 7;
    private static final List<PostVisibility> HOME_FEED_VISIBILITIES =
            List.of(PostVisibility.PUBLIC, PostVisibility.FRIENDS_ONLY);

    private final PostRepository postRepository;
    private final ContactRepository contactRepository;
    private final PostMapper postMapper;
    private final UserRepository userRepository;
    private final SavedPostRepository savedPostRepository;

    /**
     * Aggregates posts from all accepted contacts, newest first, cursor-based.
     * Includes the requester's own posts, excludes blocked users and deleted posts.
     * FRIENDS_ONLY posts are included because contacts are friends by definition.
     */
    @Transactional(readOnly = true)
    public FeedResponse getHomeFeed(String userId, String cursor, int size) {
        UUID userUuid = UUID.fromString(userId);

        List<String> followingIds = contactRepository.findFollowingIds(userUuid);
        List<String> blockedIds = contactRepository.findBlockedUserIds(userUuid);

        List<String> authorIds = Stream.concat(followingIds.stream(), Stream.of(userId))
            .distinct()
            .filter(id -> !blockedIds.contains(id))
            .toList();
        if (authorIds.isEmpty()) {
            return emptyFeed();
        }

        Instant before = parseCursor(cursor);
        // Fetch size+1 to detect whether a next page exists
        List<Post> raw = postRepository.findFeedPosts(
                authorIds, Collections.emptyList(), HOME_FEED_VISIBILITIES, before, size + 1);

        return buildFeedResponse(raw, userId, size);
    }

    /**
     * Returns the public posts of a specific author, cursor-based.
     * FRIENDS_ONLY posts are included only when the requester is friends with the author.
     */
    @Transactional(readOnly = true)
    public FeedResponse getUserFeed(String targetUserId, String requesterId, String cursor, int size) {
        UUID requesterUuid = UUID.fromString(requesterId);
        List<String> blockedIds = contactRepository.findBlockedUserIds(requesterUuid);

        if (blockedIds.contains(targetUserId)) {
            return emptyFeed();
        }

        boolean isFriend = contactRepository.findFollowingIds(requesterUuid)
                .contains(targetUserId);

        List<PostVisibility> visibilities = isFriend
                ? List.of(PostVisibility.PUBLIC, PostVisibility.FRIENDS_ONLY)
                : List.of(PostVisibility.PUBLIC);

        Instant before = parseCursor(cursor);
        List<Post> raw = postRepository.findFeedPosts(
                List.of(targetUserId), Collections.emptyList(), visibilities, before, size + 1);

        return buildFeedResponse(raw, requesterId, size);
    }

    /**
     * Explore feed: recent PUBLIC posts from the last 7 days sorted by engagement score.
     * Score = reactions.size() + commentCount * 2 + shareCount * 3.
     * Cursor is still time-based (createdAt) for consistency.
     */
    @Transactional(readOnly = true)
    public FeedResponse getExploreFeed(String requesterId, String cursor, int size) {
        Instant before = parseCursor(cursor);
        Instant since = before.minus(EXPLORE_WINDOW_DAYS, ChronoUnit.DAYS);

        List<Post> raw = postRepository.findExplorePosts(since, before, size + 1);
        return buildFeedResponse(raw, requesterId, size);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private FeedResponse emptyFeed() {
        return FeedResponse.builder()
                .items(Collections.emptyList())
                .nextCursor(null)
                .hasMore(false)
                .build();
    }

    /**
     * Parses the ISO-8601 cursor string into an Instant.
     * A null or blank cursor defaults to Instant.now() (start from the top of the feed).
     */
    private Instant parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return Instant.now();
        }
        return Instant.parse(cursor);
    }

    /**
     * Slices the raw list (which may have size+1 items), detects hasMore,
     * builds the next cursor, and maps Post → PostResponse.
     */
    private FeedResponse buildFeedResponse(List<Post> raw, String requesterId, int size) {
        boolean hasMore = raw.size() > size;
        List<Post> page = hasMore ? raw.subList(0, size) : raw;

        Map<String, User> authors = loadAuthors(page);
        List<String> postIds = page.stream().map(Post::getId).toList();
        List<String> savedPostIds = loadSavedPostIds(requesterId, postIds);

        List<PostResponse> items = page.stream()
            .map(post -> toResponse(post, requesterId, authors, savedPostIds))
                .toList();

        String nextCursor = hasMore ? page.get(page.size() - 1).getCreatedAt().toString() : null;

        return FeedResponse.builder()
                .items(items)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
    }

    private PostResponse toResponse(Post post, String requesterId) {
        return toResponse(post, requesterId, Collections.emptyMap(), Collections.emptyList());
    }

    private PostResponse toResponse(
            Post post,
            String requesterId,
            Map<String, User> authors,
            List<String> savedPostIds
    ) {
        PostResponse response = postMapper.toResponse(post);
        response.setReactions(buildReactionSummary(post, requesterId));
        response.setSavedByMe(savedPostIds.contains(post.getId()));

        User author = authors.get(post.getAuthorId());
        if (author != null) {
            response.setAuthorUsername(author.getUsername());
            response.setAuthorDisplayName(author.getDisplayName());
            response.setAuthorAvatarUrl(author.getAvatarUrl());
        }

        return response;
    }

    private List<String> loadSavedPostIds(String userId, List<String> postIds) {
        if (postIds.isEmpty()) {
            return Collections.emptyList();
        }

        return savedPostRepository.findByUserIdAndPostIdIn(userId, postIds).stream()
                .map(SavedPost::getPostId)
                .toList();
    }

    private Map<String, User> loadAuthors(List<Post> posts) {
        List<UUID> authorIds = posts.stream()
                .map(Post::getAuthorId)
                .distinct()
                .map(this::safeUuid)
                .filter(id -> id != null)
                .toList();

        if (authorIds.isEmpty()) {
            return Collections.emptyMap();
        }

        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(user -> user.getId().toString(), Function.identity()));
    }

    private UUID safeUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
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
