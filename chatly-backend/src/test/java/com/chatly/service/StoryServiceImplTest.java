package com.chatly.service;

import com.chatly.dto.response.StoryResponse;
import com.chatly.mapper.StoryMapper;
import com.chatly.model.enums.StoryPrivacy;
import com.chatly.model.enums.StoryType;
import com.chatly.model.mongo.Story;
import com.chatly.repository.mongo.CloseFriendRepository;
import com.chatly.repository.mongo.StoryReactionRepository;
import com.chatly.repository.mongo.StoryReplyRepository;
import com.chatly.repository.mongo.StoryRepository;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.FollowRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.service.impl.StoryServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoryServiceImplTest {

    private static final String REQUESTER_ID = "11111111-1111-1111-1111-111111111111";
    private static final String FOLLOWED_ID = "22222222-2222-2222-2222-222222222222";

    @Mock
    private StoryRepository storyRepository;

    @Mock
    private CloseFriendRepository closeFriendRepository;

    @Mock
    private StoryReactionRepository storyReactionRepository;

    @Mock
    private StoryReplyRepository storyReplyRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private FollowRepository followRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StoryMapper storyMapper;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private StoryServiceImpl storyService;

    @Test
    void getStoriesFeed_shouldEnforceStoryPrivacy() {
        stubFeedDependencies(true);
        when(storyRepository.findAllByUserIdInOrderByCreatedAtDesc(any()))
                .thenReturn(List.of(
                        story("public", FOLLOWED_ID, StoryPrivacy.EVERYONE),
                        story("followers", FOLLOWED_ID, StoryPrivacy.FOLLOWERS_ONLY),
                        story("close", FOLLOWED_ID, StoryPrivacy.CLOSE_FRIENDS),
                        story("only-me", FOLLOWED_ID, StoryPrivacy.ONLY_ME),
                        story("own-only-me", REQUESTER_ID, StoryPrivacy.ONLY_ME)
                ));

        List<StoryResponse> result = storyService.getStoriesFeed(REQUESTER_ID);

        assertThat(result)
                .extracting(StoryResponse::getId)
                .containsExactly("public", "followers", "close", "own-only-me");
    }

    @Test
    void getStoriesFeed_shouldHideCloseFriendsStoryWhenRequesterIsNotListed() {
        stubFeedDependencies(false);
        when(storyRepository.findAllByUserIdInOrderByCreatedAtDesc(any()))
                .thenReturn(List.of(story("close", FOLLOWED_ID, StoryPrivacy.CLOSE_FRIENDS)));

        List<StoryResponse> result = storyService.getStoriesFeed(REQUESTER_ID);

        assertThat(result).isEmpty();
    }

    private void stubFeedDependencies(boolean isCloseFriend) {
        UUID requesterUuid = UUID.fromString(REQUESTER_ID);
        when(contactRepository.findFollowingIds(requesterUuid)).thenReturn(List.of(FOLLOWED_ID));
        when(followRepository.findFollowingIdsByFollowerId(eq(requesterUuid), any(Pageable.class)))
                .thenReturn(Page.empty());
        when(closeFriendRepository.existsByOwnerIdAndFriendId(FOLLOWED_ID, REQUESTER_ID))
                .thenReturn(isCloseFriend);
        lenient().when(userRepository.findById(any())).thenReturn(Optional.empty());
        lenient().when(storyMapper.toResponse(any(Story.class))).thenAnswer(invocation -> {
            Story story = invocation.getArgument(0);
            return StoryResponse.builder()
                    .id(story.getId())
                    .userId(story.getUserId())
                    .privacy(story.getPrivacy())
                    .build();
        });
    }

    private Story story(String id, String userId, StoryPrivacy privacy) {
        return Story.builder()
                .id(id)
                .userId(userId)
                .type(StoryType.PHOTO)
                .privacy(privacy)
                .createdAt(Instant.now())
                .build();
    }
}
