package com.chatly.service;

import com.chatly.dto.response.FeedResponse;
import com.chatly.dto.response.PostResponse;
import com.chatly.mapper.PostMapper;
import com.chatly.model.enums.PostVisibility;
import com.chatly.model.mongo.Post;
import com.chatly.repository.mongo.PostRepository;
import com.chatly.repository.postgres.ContactRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private PostMapper postMapper;

    @InjectMocks
    private FeedService feedService;

    private static final String USER_ID = "11111111-1111-1111-1111-111111111111";
    private static final UUID USER_UUID = UUID.fromString(USER_ID);
    private static final String FOLLOWING_ID = "22222222-2222-2222-2222-222222222222";
    private static final String OTHER_ID = "33333333-3333-3333-3333-333333333333";
    private static final String BLOCKED_ID = "44444444-4444-4444-4444-444444444444";

    @BeforeEach
    void setUp() {
        when(postMapper.toResponse(any(Post.class))).thenAnswer(invocation -> {
            Post post = invocation.getArgument(0);
            return PostResponse.builder()
                    .id(post.getId())
                    .authorId(post.getAuthorId())
                    .createdAt(post.getCreatedAt())
                    .build();
        });
    }

    @Test
    void getHomeFeed_withFollowing_shouldReturnSortedItems() {
        when(contactRepository.findFollowingIds(USER_UUID))
                .thenReturn(List.of(FOLLOWING_ID, OTHER_ID));
        when(contactRepository.findBlockedUserIds(USER_UUID))
                .thenReturn(Collections.emptyList());

        Post newer = buildPost("post-new", FOLLOWING_ID, Instant.parse("2026-04-30T10:05:00Z"));
        Post older = buildPost("post-old", OTHER_ID, Instant.parse("2026-04-30T10:00:00Z"));

        when(postRepository.findFeedPosts(anyList(), anyList(), anyList(), any(Instant.class), eq(3)))
                .thenReturn(List.of(newer, older));

        FeedResponse response = feedService.getHomeFeed(USER_ID, null, 2);

        assertThat(response.getItems()).extracting(PostResponse::getId)
                .containsExactly("post-new", "post-old");
        assertThat(response.isHasMore()).isFalse();
        assertThat(response.getNextCursor()).isNull();
    }

    @Test
    void getHomeFeed_emptyFollowing_shouldReturnEmptyFeed() {
        when(contactRepository.findFollowingIds(USER_UUID))
                .thenReturn(Collections.emptyList());

        FeedResponse response = feedService.getHomeFeed(USER_ID, null, 2);

        assertThat(response.getItems()).isEmpty();
        assertThat(response.getNextCursor()).isNull();
        assertThat(response.isHasMore()).isFalse();
        verifyNoInteractions(postRepository);
    }

    @Test
    void getHomeFeed_withCursor_shouldFetchNextPage() {
        when(contactRepository.findFollowingIds(USER_UUID))
                .thenReturn(List.of(FOLLOWING_ID));
        when(contactRepository.findBlockedUserIds(USER_UUID))
                .thenReturn(Collections.emptyList());

        Instant cursor = Instant.parse("2026-04-30T10:00:00Z");
        Post first = buildPost("post-1", FOLLOWING_ID, Instant.parse("2026-04-30T09:59:00Z"));
        Post second = buildPost("post-2", FOLLOWING_ID, Instant.parse("2026-04-30T09:58:00Z"));
        Post third = buildPost("post-3", FOLLOWING_ID, Instant.parse("2026-04-30T09:57:00Z"));

        when(postRepository.findFeedPosts(anyList(), anyList(), anyList(), any(Instant.class), eq(3)))
                .thenReturn(List.of(first, second, third));

        FeedResponse response = feedService.getHomeFeed(USER_ID, cursor.toString(), 2);

        ArgumentCaptor<Instant> cursorCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(postRepository).findFeedPosts(anyList(), anyList(), anyList(), cursorCaptor.capture(), eq(3));
        assertThat(cursorCaptor.getValue()).isEqualTo(cursor);

        assertThat(response.getItems()).hasSize(2);
        assertThat(response.isHasMore()).isTrue();
        assertThat(response.getNextCursor()).isEqualTo(second.getCreatedAt().toString());
    }

    @Test
    void getHomeFeed_excludesBlockedUsers() {
        when(contactRepository.findFollowingIds(USER_UUID))
                .thenReturn(List.of(BLOCKED_ID));
        when(contactRepository.findBlockedUserIds(USER_UUID))
                .thenReturn(List.of(BLOCKED_ID));

        FeedResponse response = feedService.getHomeFeed(USER_ID, null, 2);

        assertThat(response.getItems()).isEmpty();
        assertThat(response.isHasMore()).isFalse();
        assertThat(response.getNextCursor()).isNull();
        verifyNoInteractions(postRepository);
    }

    @Test
    void getHomeFeed_respectsVisibility_followersOnly() {
        when(contactRepository.findFollowingIds(USER_UUID))
                .thenReturn(List.of(FOLLOWING_ID));
        when(contactRepository.findBlockedUserIds(USER_UUID))
                .thenReturn(Collections.emptyList());
        when(postRepository.findFeedPosts(anyList(), anyList(), anyList(), any(Instant.class), eq(3)))
                .thenReturn(Collections.emptyList());

        feedService.getHomeFeed(USER_ID, null, 2);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PostVisibility>> visibilitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(postRepository).findFeedPosts(anyList(), anyList(), visibilitiesCaptor.capture(), any(Instant.class), eq(3));

        assertThat(visibilitiesCaptor.getValue())
                .containsExactly(PostVisibility.PUBLIC, PostVisibility.FOLLOWERS_ONLY);
    }

    @Test
    void getHomeFeed_excludesOwnPosts() {
        when(contactRepository.findFollowingIds(USER_UUID))
                .thenReturn(List.of(USER_ID, FOLLOWING_ID));
        when(contactRepository.findBlockedUserIds(USER_UUID))
                .thenReturn(Collections.emptyList());
        when(postRepository.findFeedPosts(anyList(), anyList(), anyList(), any(Instant.class), eq(3)))
                .thenReturn(Collections.emptyList());

        feedService.getHomeFeed(USER_ID, null, 2);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<String>> authorIdsCaptor = ArgumentCaptor.forClass(List.class);
        verify(postRepository).findFeedPosts(authorIdsCaptor.capture(), anyList(), anyList(), any(Instant.class), eq(3));

        assertThat(authorIdsCaptor.getValue()).containsExactly(FOLLOWING_ID);
    }

    private Post buildPost(String id, String authorId, Instant createdAt) {
        return Post.builder()
                .id(id)
                .authorId(authorId)
                .content("feed post")
                .visibility(PostVisibility.PUBLIC)
                .mediaUrls(new ArrayList<>())
                .hashtags(new ArrayList<>())
                .reactions(new ArrayList<>())
                .commentCount(0)
                .shareCount(0)
                .createdAt(createdAt)
                .build();
    }
}
