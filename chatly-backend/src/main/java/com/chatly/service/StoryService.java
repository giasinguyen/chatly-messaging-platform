package com.chatly.service;

import com.chatly.dto.request.ReactRequest;
import com.chatly.dto.request.StoryCreationRequest;
import com.chatly.dto.request.StoryReplyRequest;
import com.chatly.dto.response.StoryReactionResponse;
import com.chatly.dto.response.StoryReplyResponse;
import com.chatly.dto.response.StoryResponse;
import com.chatly.dto.response.UserResponse;

import java.util.List;

public interface StoryService {
    StoryResponse createStory(String userId, StoryCreationRequest request);
    List<StoryResponse> getUserStories(String userId);
    List<StoryResponse> getActiveStoriesForUser(String userId);
    List<StoryResponse> getStoriesFeed(String userId);
    void recordView(String storyId, String viewerId);
    List<UserResponse> getViewers(String storyId, String requesterId);
    void deleteStory(String storyId, String userId);

    StoryReactionResponse reactToStory(String storyId, String reactorId, ReactRequest request);
    void removeReaction(String storyId, String reactorId);
    List<StoryReactionResponse> getReactions(String storyId, String requesterId);

    StoryReplyResponse replyToStory(String storyId, String replierId, StoryReplyRequest request);
    List<StoryReplyResponse> getReplies(String storyId, String requesterId);
}
