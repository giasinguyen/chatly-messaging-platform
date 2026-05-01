package com.chatly.repository.mongo;

import com.chatly.model.mongo.Story;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoryRepository extends MongoRepository<Story, String> {
    List<Story> findAllByUserIdOrderByCreatedAtDesc(String userId);
    List<Story> findAllByUserIdInOrderByCreatedAtDesc(List<String> userIds);
}
