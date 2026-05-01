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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock
    private FollowRepository followRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ContactService contactService;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private PostRepository postRepository;

    @InjectMocks
    private FollowService followService;

    private static final String FOLLOWER_ID = "550e8400-e29b-41d4-a716-446655440001";
    private static final String FOLLOWEE_ID = "550e8400-e29b-41d4-a716-446655440002";
    private static final UUID FOLLOWER_UUID = UUID.fromString(FOLLOWER_ID);
    private static final UUID FOLLOWEE_UUID = UUID.fromString(FOLLOWEE_ID);

    private User followerUser;
    private User followeeUser;

    @BeforeEach
    void setUp() {
        // Setup SecurityContext
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication authentication = mock(Authentication.class);
        lenient().when(authentication.getPrincipal()).thenReturn(FOLLOWER_ID);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);

        // Setup mock users
        followerUser = User.builder()
                .id(FOLLOWER_UUID)
                .username("follower")
                .displayName("Follower User")
                .email("follower@test.com")
                .build();

        followeeUser = User.builder()
                .id(FOLLOWEE_UUID)
                .username("followee")
                .displayName("Followee User")
                .email("followee@test.com")
                .build();

        // Setup Redis mock
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 1: Follow Success
    // ────────────────────────────────────────────────────────────────────
    @Test
    void follow_validRequest_shouldCreateFollowAndNotify() {
        when(userRepository.findById(FOLLOWER_UUID)).thenReturn(Optional.of(followerUser));
        when(userRepository.findById(FOLLOWEE_UUID)).thenReturn(Optional.of(followeeUser));
        when(contactService.isBlocked(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(false);
        when(followRepository.existsByFollowerIdAndFolloweeId(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(false);

        followService.follow(FOLLOWER_ID, FOLLOWEE_ID);

        verify(followRepository).save(argThat(f ->
                f.getFollower().getId().equals(FOLLOWER_UUID) &&
                f.getFollowee().getId().equals(FOLLOWEE_UUID)
        ));

        ArgumentCaptor<NotificationType> typeCaptor = ArgumentCaptor.forClass(NotificationType.class);
        verify(notificationService).createAndPush(
                typeCaptor.capture(),
                eq(FOLLOWER_ID),
                eq(FOLLOWEE_ID),
                contains("started following"),
                eq(FOLLOWER_ID)
        );
        assertThat(typeCaptor.getValue()).isEqualTo(NotificationType.NEW_FOLLOWER);

        verify(valueOperations).set(
                eq("follow:" + FOLLOWER_ID + ":" + FOLLOWEE_ID),
                eq("true"),
                eq(60L),
                eq(TimeUnit.SECONDS)
        );
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 2: Double-Follow Conflict
    // ────────────────────────────────────────────────────────────────────
    @Test
    void follow_alreadyFollowing_shouldThrowConflict() {
        when(userRepository.findById(FOLLOWER_UUID)).thenReturn(Optional.of(followerUser));
        when(userRepository.findById(FOLLOWEE_UUID)).thenReturn(Optional.of(followeeUser));
        when(contactService.isBlocked(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(false);
        when(followRepository.existsByFollowerIdAndFolloweeId(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(true);

        assertThatThrownBy(() -> followService.follow(FOLLOWER_ID, FOLLOWEE_ID))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ALREADY_FOLLOWING);

        verify(notificationService, never()).createAndPush(any(), any(), any(), any(), any());
        verify(valueOperations, never()).set(anyString(), anyString(), anyLong(), any());
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 3: Unfollow Success
    // ────────────────────────────────────────────────────────────────────
    @Test
    void unfollow_existingFollow_shouldDeleteAndEvictCache() {
        Follow follow = Follow.builder()
                .id(UUID.randomUUID())
                .follower(followerUser)
                .followee(followeeUser)
                .build();

        when(followRepository.findByFollowerIdAndFolloweeId(FOLLOWER_UUID, FOLLOWEE_UUID))
                .thenReturn(Optional.of(follow));

        followService.unfollow(FOLLOWER_ID, FOLLOWEE_ID);

        verify(followRepository).delete(follow);
        verify(valueOperations).set(
                eq("follow:" + FOLLOWER_ID + ":" + FOLLOWEE_ID),
                eq("false"),
                eq(60L),
                eq(TimeUnit.SECONDS)
        );
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 4: Unfollow When Not Following
    // ────────────────────────────────────────────────────────────────────
    @Test
    void unfollow_notFollowing_shouldThrowNotFound() {
        when(followRepository.findByFollowerIdAndFolloweeId(FOLLOWER_UUID, FOLLOWEE_UUID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> followService.unfollow(FOLLOWER_ID, FOLLOWEE_ID))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.NOT_FOLLOWING);

        verify(valueOperations, never()).set(anyString(), anyString(), anyLong(), any());
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 5: Self-Follow Rejected
    // ────────────────────────────────────────────────────────────────────
    @Test
    void follow_selfFollow_shouldThrowError() {
        assertThatThrownBy(() -> followService.follow(FOLLOWER_ID, FOLLOWER_ID))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.CANNOT_FOLLOW_SELF);

        verify(userRepository, never()).findById(any());
        verify(followRepository, never()).save(any());
        verify(notificationService, never()).createAndPush(any(), any(), any(), any(), any());
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 6: Get Followers with Pagination
    // ────────────────────────────────────────────────────────────────────
    @Test
    void getFollowers_withPagination_shouldReturnPagedUsers() {
        Pageable pageable = PageRequest.of(0, 10);

        UUID follower1Id = UUID.randomUUID();
        UUID follower2Id = UUID.randomUUID();
        Page<UUID> followerIds = new PageImpl<>(List.of(follower1Id, follower2Id), pageable, 2);

        when(userRepository.existsById(FOLLOWEE_UUID)).thenReturn(true);
        when(contactService.isBlockedBy(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(false);
        when(followRepository.findFollowerIdsByFolloweeId(FOLLOWEE_UUID, pageable)).thenReturn(followerIds);

        User follower1 = User.builder().id(follower1Id).displayName("User 1").build();
        User follower2 = User.builder().id(follower2Id).displayName("User 2").build();
        when(userRepository.findAllById(any())).thenReturn(List.of(follower1, follower2));

        UserResponse resp1 = UserResponse.builder().id(follower1Id.toString()).displayName("User 1").build();
        UserResponse resp2 = UserResponse.builder().id(follower2Id.toString()).displayName("User 2").build();
        when(userMapper.toResponse(follower1)).thenReturn(resp1);
        when(userMapper.toResponse(follower2)).thenReturn(resp2);

        PagedResponse<UserResponse> result = followService.getFollowers(FOLLOWEE_ID, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getItems()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getPage()).isEqualTo(0);
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 7 (Bonus): isFollowing with Cache Hit
    // ────────────────────────────────────────────────────────────────────
    @Test
    void isFollowing_withCacheHit_shouldNotQueryDatabase() {
        String cacheKey = "follow:" + FOLLOWER_ID + ":" + FOLLOWEE_ID;
        when(valueOperations.get(cacheKey)).thenReturn("true");

        boolean result = followService.isFollowing(FOLLOWER_ID, FOLLOWEE_ID);

        assertThat(result).isTrue();
        verify(followRepository, never()).existsByFollowerIdAndFolloweeId(any(), any());
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 8 (Bonus): isFollowing with Cache Miss
    // ────────────────────────────────────────────────────────────────────
    @Test
    void isFollowing_withCacheMiss_shouldQueryDatabaseAndCache() {
        String cacheKey = "follow:" + FOLLOWER_ID + ":" + FOLLOWEE_ID;
        when(valueOperations.get(cacheKey)).thenReturn(null);
        when(followRepository.existsByFollowerIdAndFolloweeId(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(true);

        boolean result = followService.isFollowing(FOLLOWER_ID, FOLLOWEE_ID);

        assertThat(result).isTrue();
        verify(followRepository).existsByFollowerIdAndFolloweeId(FOLLOWER_UUID, FOLLOWEE_UUID);
        verify(valueOperations).set(cacheKey, "true", 60, TimeUnit.SECONDS);
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 9 (Bonus): Follow Blocked by Contact Relationship
    // ────────────────────────────────────────────────────────────────────
    @Test
    void follow_blockedRelationship_shouldThrowForbidden() {
        when(userRepository.findById(FOLLOWER_UUID)).thenReturn(Optional.of(followerUser));
        when(userRepository.findById(FOLLOWEE_UUID)).thenReturn(Optional.of(followeeUser));
        when(contactService.isBlocked(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(true);

        assertThatThrownBy(() -> followService.follow(FOLLOWER_ID, FOLLOWEE_ID))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.FOLLOW_ACTION_BLOCKED);

        verify(followRepository, never()).save(any());
        verify(notificationService, never()).createAndPush(any(), any(), any(), any(), any());
    }

    // ────────────────────────────────────────────────────────────────────
    // ✅ Test 10 (Bonus): Get Stats with Metadata
    // ────────────────────────────────────────────────────────────────────
    @Test
    void getUserSocialStats_validRequest_shouldReturnStatsWithMetadata() {
        when(userRepository.existsById(FOLLOWEE_UUID)).thenReturn(true);
        when(contactService.isBlockedBy(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(false);
        when(followRepository.countByFolloweeId(FOLLOWEE_UUID)).thenReturn(5L);
        when(followRepository.countByFollowerId(FOLLOWEE_UUID)).thenReturn(10L);
        when(postRepository.countByAuthorId(FOLLOWEE_ID)).thenReturn(8L);
        when(valueOperations.get("follow:" + FOLLOWER_ID + ":" + FOLLOWEE_ID)).thenReturn(null);
        when(followRepository.existsByFollowerIdAndFolloweeId(FOLLOWER_UUID, FOLLOWEE_UUID)).thenReturn(false);

        UserSocialStatsResponse result = followService.getUserSocialStats(FOLLOWEE_ID);

        assertThat(result).isNotNull();
        assertThat(result.getFollowers()).isEqualTo(5L);
        assertThat(result.getFollowing()).isEqualTo(10L);
        assertThat(result.getPosts()).isEqualTo(8L);
        assertThat(result.getMetadata())
                .containsKeys("generatedAt", "targetUserId", "viewerUserId", "isFollowing", "isSelf", "version")
                .containsEntry("isSelf", false)
                .containsEntry("isFollowing", false)
                .containsEntry("version", "v1");
    }
}
