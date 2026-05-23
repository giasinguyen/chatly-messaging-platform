package com.chatly.service.impl;

import com.chatly.dto.request.ReactRequest;
import com.chatly.dto.request.StoryCreationRequest;
import com.chatly.dto.request.StoryReplyRequest;
import com.chatly.dto.response.StoryReactionResponse;
import com.chatly.dto.response.StoryReplyResponse;
import com.chatly.dto.response.StoryResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.StoryMapper;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.enums.StoryPrivacy;
import com.chatly.model.mongo.Story;
import com.chatly.model.mongo.StoryReaction;
import com.chatly.model.mongo.StoryReply;
import com.chatly.repository.mongo.CloseFriendRepository;
import com.chatly.repository.mongo.StoryReactionRepository;
import com.chatly.repository.mongo.StoryReplyRepository;
import com.chatly.repository.mongo.StoryRepository;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.FollowRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.service.NotificationService;
import com.chatly.service.StoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoryServiceImpl implements StoryService {

    private static final long STORY_TTL_HOURS = 24L;

    private final StoryRepository storyRepository;
    private final CloseFriendRepository closeFriendRepository;
    private final StoryReactionRepository storyReactionRepository;
    private final StoryReplyRepository storyReplyRepository;
    private final ContactRepository contactRepository;
    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final StoryMapper storyMapper;
    private final NotificationService notificationService;

    @Override
    public StoryResponse createStory(String userId, StoryCreationRequest request) {
        log.info("Creating story for user: {}", userId);

        Story story = Story.builder()
                .userId(userId)
                .type(request.getType())
                .content(request.getContent())
                .mediaUrl(request.getMediaUrl())
                .musicUrl(request.getMusicUrl())
                .musicName(request.getMusicName())
                .bgIndex(request.getBgIndex())
                .fontSize(request.getFontSize())
                .privacy(request.getPrivacy())
                .build();

        return toResponse(storyRepository.save(story), userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponse> getUserStories(String userId) {
        return storyRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(story -> toResponse(story, userId))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponse> getActiveStoriesForUser(String userId) {
        Instant cutoff = Instant.now().minus(STORY_TTL_HOURS, ChronoUnit.HOURS);
        return storyRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(s -> s.getCreatedAt().isAfter(cutoff))
                .map(story -> toResponseWithUser(story, userId))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponse> getStoriesFeed(String userId) {
        UUID userUuid = UUID.fromString(userId);
        Set<String> followedUserIds = findFollowedUserIds(userUuid);
        Set<String> candidateUserIds = new LinkedHashSet<>(followedUserIds);
        candidateUserIds.add(userId);

        Instant cutoff = Instant.now().minus(STORY_TTL_HOURS, ChronoUnit.HOURS);
        return storyRepository.findAllByUserIdInOrderByCreatedAtDesc(new ArrayList<>(candidateUserIds)).stream()
                .filter(s -> s.getCreatedAt().isAfter(cutoff))
                .filter(story -> canViewStory(story, userId, followedUserIds))
                .map(story -> toResponseWithUser(story, userId))
                .collect(Collectors.toList());
    }

    @Override
    public void recordView(String storyId, String viewerId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new AppException(ErrorCode.STORY_NOT_FOUND));

        if (story.getUserId().equals(viewerId)) {
            return;
        }

        if (!story.getViewerIds().contains(viewerId)) {
            story.getViewerIds().add(viewerId);
            story.setViewCount(story.getViewerIds().size());
            storyRepository.save(story);
            log.info("Story {} viewed by user {}", storyId, viewerId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getViewers(String storyId, String requesterId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new AppException(ErrorCode.STORY_NOT_FOUND));

        if (!story.getUserId().equals(requesterId)) {
            throw new AppException(ErrorCode.STORY_FORBIDDEN);
        }

        return story.getViewerIds().stream()
                .map(viewerId -> userRepository.findById(UUID.fromString(viewerId))
                        .map(user -> UserResponse.builder()
                                .id(user.getId().toString())
                                .username(user.getUsername())
                                .displayName(user.getDisplayName())
                                .avatarUrl(user.getAvatarUrl())
                                .build())
                        .orElse(null))
                .filter(r -> r != null)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteStory(String storyId, String userId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new AppException(ErrorCode.STORY_NOT_FOUND));

        if (!story.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.STORY_FORBIDDEN);
        }

        storyRepository.delete(story);
        log.info("Story {} deleted by user {}", storyId, userId);
    }

    @Override
    public StoryReactionResponse reactToStory(String storyId, String reactorId, ReactRequest request) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new AppException(ErrorCode.STORY_NOT_FOUND));

        StoryReaction reaction = storyReactionRepository.findByStoryIdAndUserId(storyId, reactorId)
                .map(existing -> {
                    existing.setEmoji(request.getEmoji());
                    return existing;
                })
                .orElseGet(() -> StoryReaction.builder()
                        .storyId(storyId)
                        .userId(reactorId)
                        .emoji(request.getEmoji())
                        .build());

        reaction = storyReactionRepository.save(reaction);

        String senderName = userRepository.findById(UUID.fromString(reactorId))
                .map(u -> u.getDisplayName() != null ? u.getDisplayName() : u.getUsername())
                .orElse("Someone");

        notificationService.createAndPush(
                NotificationType.STORY_REACTED,
                reactorId,
                story.getUserId(),
                senderName + " reacted " + request.getEmoji() + " to your story",
                storyId
        );

        log.info("User {} reacted {} to story {}", reactorId, request.getEmoji(), storyId);
        return toReactionResponse(reaction);
    }

    @Override
    public void removeReaction(String storyId, String reactorId) {
        storyRepository.findById(storyId)
                .orElseThrow(() -> new AppException(ErrorCode.STORY_NOT_FOUND));
        storyReactionRepository.deleteByStoryIdAndUserId(storyId, reactorId);
        log.info("User {} removed reaction from story {}", reactorId, storyId);
    }

    @Override
    public List<StoryReactionResponse> getReactions(String storyId, String requesterId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new AppException(ErrorCode.STORY_NOT_FOUND));

        if (!story.getUserId().equals(requesterId)) {
            throw new AppException(ErrorCode.STORY_FORBIDDEN);
        }

        return storyReactionRepository.findAllByStoryId(storyId).stream()
                .map(this::toReactionResponse)
                .collect(Collectors.toList());
    }

    @Override
    public StoryReplyResponse replyToStory(String storyId, String replierId, StoryReplyRequest request) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new AppException(ErrorCode.STORY_NOT_FOUND));

        StoryReply reply = StoryReply.builder()
                .storyId(storyId)
                .userId(replierId)
                .content(request.getContent())
                .build();

        reply = storyReplyRepository.save(reply);

        String senderName = userRepository.findById(UUID.fromString(replierId))
                .map(u -> u.getDisplayName() != null ? u.getDisplayName() : u.getUsername())
                .orElse("Someone");

        notificationService.createAndPush(
                NotificationType.STORY_REPLIED,
                replierId,
                story.getUserId(),
                senderName + " replied to your story: " + truncate(request.getContent(), 50),
                storyId
        );

        log.info("User {} replied to story {}", replierId, storyId);
        return toReplyResponse(reply);
    }

    @Override
    public List<StoryReplyResponse> getReplies(String storyId, String requesterId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new AppException(ErrorCode.STORY_NOT_FOUND));

        if (!story.getUserId().equals(requesterId)) {
            throw new AppException(ErrorCode.STORY_FORBIDDEN);
        }

        return storyReplyRepository.findAllByStoryIdOrderByCreatedAtAsc(storyId).stream()
                .map(this::toReplyResponse)
                .collect(Collectors.toList());
    }

    private Set<String> findFollowedUserIds(UUID userUuid) {
        Set<String> userIds = new LinkedHashSet<>(contactRepository.findFollowingIds(userUuid));
        followRepository.findFollowingIdsByFollowerId(userUuid, Pageable.unpaged())
                .forEach(followeeId -> userIds.add(followeeId.toString()));
        return userIds;
    }

    private boolean canViewStory(Story story, String requesterId, Set<String> followedUserIds) {
        if (requesterId.equals(story.getUserId())) {
            return true;
        }

        StoryPrivacy privacy = story.getPrivacy() != null ? story.getPrivacy() : StoryPrivacy.EVERYONE;
        return switch (privacy) {
            case EVERYONE -> true;
            case FRIENDS_ONLY -> followedUserIds.contains(story.getUserId());
            case CLOSE_FRIENDS -> closeFriendRepository.existsByOwnerIdAndFriendId(story.getUserId(), requesterId);
            case ONLY_ME -> false;
        };
    }

    private StoryResponse toResponse(Story story, String requesterId) {
        StoryResponse response = storyMapper.toResponse(story);
        response.setViewedByMe(story.getViewerIds().contains(requesterId));
        return response;
    }

    private StoryResponse toResponseWithUser(Story story, String requesterId) {
        StoryResponse response = toResponse(story, requesterId);
        userRepository.findById(UUID.fromString(story.getUserId())).ifPresent(user ->
                response.setUser(UserResponse.builder()
                        .id(user.getId().toString())
                        .username(user.getUsername())
                        .displayName(user.getDisplayName())
                        .avatarUrl(user.getAvatarUrl())
                        .build())
        );
        return response;
    }

    private StoryReactionResponse toReactionResponse(StoryReaction reaction) {
        StoryReactionResponse response = StoryReactionResponse.builder()
                .id(reaction.getId())
                .storyId(reaction.getStoryId())
                .userId(reaction.getUserId())
                .emoji(reaction.getEmoji())
                .createdAt(reaction.getCreatedAt())
                .build();

        try {
            userRepository.findById(UUID.fromString(reaction.getUserId())).ifPresent(user ->
                    response.setUser(UserResponse.builder()
                            .id(user.getId().toString())
                            .username(user.getUsername())
                            .displayName(user.getDisplayName())
                            .avatarUrl(user.getAvatarUrl())
                            .build())
            );
        } catch (Exception e) {
            log.warn("Could not load user for reaction {}", reaction.getId());
        }

        return response;
    }

    private StoryReplyResponse toReplyResponse(StoryReply reply) {
        StoryReplyResponse response = StoryReplyResponse.builder()
                .id(reply.getId())
                .storyId(reply.getStoryId())
                .userId(reply.getUserId())
                .content(reply.getContent())
                .createdAt(reply.getCreatedAt())
                .build();

        try {
            userRepository.findById(UUID.fromString(reply.getUserId())).ifPresent(user ->
                    response.setUser(UserResponse.builder()
                            .id(user.getId().toString())
                            .username(user.getUsername())
                            .displayName(user.getDisplayName())
                            .avatarUrl(user.getAvatarUrl())
                            .build())
            );
        } catch (Exception e) {
            log.warn("Could not load user for reply {}", reply.getId());
        }

        return response;
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
