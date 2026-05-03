package com.chatly.service.impl;

import com.chatly.dto.request.StoryCreationRequest;
import com.chatly.dto.response.StoryResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.StoryMapper;
import com.chatly.model.mongo.Story;
import com.chatly.repository.mongo.StoryRepository;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.service.StoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoryServiceImpl implements StoryService {

    private final StoryRepository storyRepository;
    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final StoryMapper storyMapper;

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
    public List<StoryResponse> getUserStories(String userId) {
        return storyRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(story -> toResponse(story, userId))
                .collect(Collectors.toList());
    }

    @Override
    public List<StoryResponse> getActiveStoriesForUser(String userId) {
        Instant cutoff = Instant.now().minus(24, ChronoUnit.HOURS);
        return storyRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(s -> s.getCreatedAt().isAfter(cutoff))
                .map(story -> toResponseWithUser(story, userId))
                .collect(Collectors.toList());
    }

    @Override
    public List<StoryResponse> getStoriesFeed(String userId) {
        UUID userUuid = UUID.fromString(userId);
        List<String> friendIds = contactRepository.findFriendsAndBlocked(userUuid).stream()
                .map(contact -> {
                    if (contact.getUser().getId().equals(userUuid)) {
                        return contact.getContact().getId().toString();
                    } else {
                        return contact.getUser().getId().toString();
                    }
                })
                .collect(Collectors.toList());

        friendIds.add(userId);

        Instant cutoff = Instant.now().minus(24, ChronoUnit.HOURS);
        return storyRepository.findAllByUserIdInOrderByCreatedAtDesc(friendIds).stream()
                .filter(s -> s.getCreatedAt().isAfter(cutoff))
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
}
