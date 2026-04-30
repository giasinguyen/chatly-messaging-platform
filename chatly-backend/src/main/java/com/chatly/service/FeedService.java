package com.chatly.service;

import com.chatly.dto.response.FeedResponse;
import com.chatly.dto.response.PostReactionSummary;
import com.chatly.dto.response.PostResponse;
import com.chatly.mapper.PostMapper;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.enums.ReactionType;
import com.chatly.model.mongo.Post;
import com.chatly.model.mongo.PostReaction;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.postgres.ContactRepository;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedService {

    private static final int EXPLORE_WINDOW_DAYS = 7;
    private static final List<PostVisibility> HOME_FEED_VISIBILITIES =
            List.of(PostVisibility.PUBLIC, PostVisibility.FOLLOWERS_ONLY);

    private final PostRepository postRepository;
    private final ContactRepository contactRepository;
    private final PostMapper postMapper;

    /**
     * Aggregates posts from all users the requester follows, newest first, cursor-based.
     * Excludes the requester's own posts, posts from blocked users, and deleted posts.
     * FOLLOWERS_ONLY posts are included because the requester is a follower by definition.
     */
    @Transactional(readOnly = true)
    public FeedResponse getHomeFeed(String userId, String cursor, int size) {
        UUID userUuid = UUID.fromString(userId);

        List<String> followingIds = contactRepository.findFollowingIds(userUuid);
        if (followingIds.isEmpty()) {
            log.debug("Home feed empty — user={} has no following", userId);
            return emptyFeed();
        }

        List<String> blockedIds = contactRepository.findBlockedUserIds(userUuid);

        // Exclude self and blocked authors from the author whitelist
        List<String> authorIds = followingIds.stream()
                .filter(id -> !id.equals(userId) && !blockedIds.contains(id))
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
     * FOLLOWERS_ONLY posts are included only when the requester follows the author.
     */
    @Transactional(readOnly = true)
    public FeedResponse getUserFeed(String targetUserId, String requesterId, String cursor, int size) {
        UUID requesterUuid = UUID.fromString(requesterId);
        List<String> blockedIds = contactRepository.findBlockedUserIds(requesterUuid);

        if (blockedIds.contains(targetUserId)) {
            return emptyFeed();
        }

        boolean isFollowing = contactRepository.findFollowingIds(requesterUuid)
                .contains(targetUserId);

        List<PostVisibility> visibilities = isFollowing
                ? List.of(PostVisibility.PUBLIC, PostVisibility.FOLLOWERS_ONLY)
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

        List<PostResponse> items = page.stream()
                .map(post -> toResponse(post, requesterId))
                .toList();

        String nextCursor = hasMore ? page.get(page.size() - 1).getCreatedAt().toString() : null;

        return FeedResponse.builder()
                .items(items)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
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
