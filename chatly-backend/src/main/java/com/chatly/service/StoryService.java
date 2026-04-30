package com.chatly.service;

import com.chatly.dto.request.StoryCreationRequest;
import com.chatly.dto.response.StoryResponse;

import java.util.List;

public interface StoryService {
    StoryResponse createStory(String userId, StoryCreationRequest request);
    List<StoryResponse> getUserStories(String userId);
    List<StoryResponse> getActiveStoriesForUser(String userId);
    List<StoryResponse> getStoriesFeed(String userId);
}
