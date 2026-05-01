package com.chatly.service;

import com.chatly.dto.response.PagedResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.dto.response.UserSocialStatsResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.UserMapper;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.postgres.Follow;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.postgres.FollowRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private static final String FOLLOW_CACHE_PREFIX = "follow:";
    private static final long FOLLOW_CACHE_TTL_SECONDS = 60;

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final NotificationService notificationService;
    private final ContactService contactService;
    private final RedisTemplate<String, String> redisTemplate;
    private final PostRepository postRepository;

    @Transactional
    public void follow(String followerId, String followeeId) {
        UUID followerUuid = parseUuid(followerId);
        UUID followeeUuid = parseUuid(followeeId);

        if (followerUuid.equals(followeeUuid)) {
            throw new AppException(ErrorCode.CANNOT_FOLLOW_SELF);
        }

        User follower = userRepository.findById(followerUuid)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        User followee = userRepository.findById(followeeUuid)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (contactService.isBlocked(followerUuid, followeeUuid)) {
            throw new AppException(ErrorCode.FOLLOW_ACTION_BLOCKED);
        }

        if (followRepository.existsByFollowerIdAndFolloweeId(followerUuid, followeeUuid)) {
            throw new AppException(ErrorCode.ALREADY_FOLLOWING);
        }

        Follow follow = Follow.builder()
                .follower(follower)
                .followee(followee)
                .build();

        followRepository.save(follow);

        cacheFollowStatus(followerId, followeeId, true);

        notificationService.createAndPush(
                NotificationType.NEW_FOLLOWER,
                followerId,
                followeeId,
                follower.getDisplayName() + " started following you",
                followerId
        );
    }

    @Transactional
    public void unfollow(String followerId, String followeeId) {
        UUID followerUuid = parseUuid(followerId);
        UUID followeeUuid = parseUuid(followeeId);

        Follow follow = followRepository.findByFollowerIdAndFolloweeId(followerUuid, followeeUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOLLOWING));

        followRepository.delete(follow);
        cacheFollowStatus(followerId, followeeId, false);
    }

    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> getFollowers(String userId, Pageable pageable) {
        UUID targetUserId = parseUuid(userId);
        ensureUserExists(targetUserId);

        assertActivityAccess(targetUserId);

        Page<UUID> followerIds = followRepository.findFollowerIdsByFolloweeId(targetUserId, pageable);
        return toPagedUsersResponse(followerIds, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> getFollowing(String userId, Pageable pageable) {
        UUID targetUserId = parseUuid(userId);
        ensureUserExists(targetUserId);

        assertActivityAccess(targetUserId);

        Page<UUID> followingIds = followRepository.findFollowingIdsByFollowerId(targetUserId, pageable);
        return toPagedUsersResponse(followingIds, pageable);
    }

    @Transactional(readOnly = true)
    public boolean isFollowing(String followerId, String followeeId) {
        String cacheKey = buildFollowCacheKey(followerId, followeeId);
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return Boolean.parseBoolean(cached);
        }

        boolean isFollowing = followRepository.existsByFollowerIdAndFolloweeId(
                parseUuid(followerId),
                parseUuid(followeeId)
        );

        cacheFollowStatus(followerId, followeeId, isFollowing);
        return isFollowing;
    }

    @Transactional(readOnly = true)
    public UserSocialStatsResponse getUserSocialStats(String userId) {
        UUID targetUserId = parseUuid(userId);
        ensureUserExists(targetUserId);

        assertActivityAccess(targetUserId);

        String requesterId = getAuthenticatedUserId();
        long followers = followRepository.countByFolloweeId(targetUserId);
        long following = followRepository.countByFollowerId(targetUserId);
        long posts = postRepository.countByAuthorId(userId);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("generatedAt", Instant.now().toString());
        metadata.put("targetUserId", userId);
        metadata.put("viewerUserId", requesterId);
        metadata.put("isFollowing", isFollowing(requesterId, userId));
        metadata.put("isSelf", requesterId.equals(userId));
        metadata.put("version", "v1");

        return UserSocialStatsResponse.builder()
                .followers(followers)
                .following(following)
                .posts(posts)
                .metadata(metadata)
                .build();
    }

    private PagedResponse<UserResponse> toPagedUsersResponse(Page<UUID> userIdsPage, Pageable pageable) {
        List<UUID> userIds = userIdsPage.getContent();
        if (userIds.isEmpty()) {
            return PagedResponse.from(Page.empty(pageable));
        }

        Map<UUID, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<UserResponse> orderedUsers = userIds.stream()
                .map(usersById::get)
                .filter(user -> user != null)
                .map(userMapper::toResponse)
                .toList();

        Page<UserResponse> usersPage = new PageImpl<>(orderedUsers, pageable, userIdsPage.getTotalElements());
        return PagedResponse.from(usersPage);
    }

    private void assertActivityAccess(UUID targetUserId) {
        String requester = getAuthenticatedUserId();
        UUID requesterId = parseUuid(requester);

        if (requesterId.equals(targetUserId)) {
            return;
        }

        if (contactService.isBlockedBy(requesterId, targetUserId)) {
            throw new AppException(ErrorCode.FOLLOW_ACTION_BLOCKED);
        }
    }

    private void ensureUserExists(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
    }

    private void cacheFollowStatus(String followerId, String followeeId, boolean isFollowing) {
        redisTemplate.opsForValue().set(
                buildFollowCacheKey(followerId, followeeId),
                Boolean.toString(isFollowing),
                FOLLOW_CACHE_TTL_SECONDS,
                TimeUnit.SECONDS
        );
    }

    private String buildFollowCacheKey(String followerId, String followeeId) {
        return FOLLOW_CACHE_PREFIX + followerId + ":" + followeeId;
    }

    private UUID parseUuid(String id) {
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return authentication.getPrincipal().toString();
    }
}
