package com.chatly.repository.mongo;

import com.chatly.model.mongo.StoryReply;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StoryReplyRepository extends MongoRepository<StoryReply, String> {
    List<StoryReply> findAllByStoryIdOrderByCreatedAtAsc(String storyId);
}
