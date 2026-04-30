package com.chatly.service.impl;

import com.chatly.dto.request.StoryCreationRequest;
import com.chatly.dto.response.StoryResponse;
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

        return storyMapper.toResponse(storyRepository.save(story));
    }

    @Override
    public List<StoryResponse> getUserStories(String userId) {
        return storyRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(storyMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<StoryResponse> getActiveStoriesForUser(String userId) {
        Instant twentyFourHoursAgo = Instant.now().minus(24, ChronoUnit.HOURS);
        return storyRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(s -> s.getCreatedAt().isAfter(twentyFourHoursAgo))
                .map(this::mapToResponseWithUser)
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

        Instant twentyFourHoursAgo = Instant.now().minus(24, ChronoUnit.HOURS);
        return storyRepository.findAllByUserIdInOrderByCreatedAtDesc(friendIds).stream()
                .filter(s -> s.getCreatedAt().isAfter(twentyFourHoursAgo))
                .map(this::mapToResponseWithUser)
                .collect(Collectors.toList());
    }

    private StoryResponse mapToResponseWithUser(Story story) {
        StoryResponse response = storyMapper.toResponse(story);
        userRepository.findById(UUID.fromString(story.getUserId())).ifPresent(user -> {
            response.setUser(com.chatly.dto.response.UserResponse.builder()
                    .id(user.getId().toString())
                    .username(user.getUsername())
                    .displayName(user.getDisplayName())
                    .avatarUrl(user.getAvatarUrl())
                    .build());
        });
        return response;
    }
}
