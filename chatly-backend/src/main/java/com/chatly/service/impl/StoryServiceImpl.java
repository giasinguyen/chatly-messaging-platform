package com.chatly.service.impl;

import com.chatly.dto.request.StoryCreationRequest;
import com.chatly.dto.response.StoryResponse;
import com.chatly.mapper.StoryMapper;
import com.chatly.model.mongo.Story;
import com.chatly.repository.mongo.StoryRepository;
import com.chatly.service.StoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoryServiceImpl implements StoryService {

    private final StoryRepository storyRepository;
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
        // MongoDB TTL will handle deletion, but for extra safety or if TTL is slow:
        Instant twentyFourHoursAgo = Instant.now().minus(24, ChronoUnit.HOURS);
        return storyRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(s -> s.getCreatedAt().isAfter(twentyFourHoursAgo))
                .map(storyMapper::toResponse)
                .collect(Collectors.toList());
    }
}
