package com.chatly.repository.mongo;

import com.chatly.model.mongo.StoryReaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StoryReactionRepository extends MongoRepository<StoryReaction, String> {
    List<StoryReaction> findAllByStoryId(String storyId);
    Optional<StoryReaction> findByStoryIdAndUserId(String storyId, String userId);
    void deleteByStoryIdAndUserId(String storyId, String userId);
    boolean existsByStoryIdAndUserId(String storyId, String userId);
}
