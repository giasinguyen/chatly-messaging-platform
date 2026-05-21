package com.chatly.repository.mongo;

import com.chatly.model.mongo.SavedPost;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SavedPostRepository extends MongoRepository<SavedPost, String> {

    boolean existsByUserIdAndPostId(String userId, String postId);

    void deleteByUserIdAndPostId(String userId, String postId);

    List<SavedPost> findByUserIdOrderByCreatedAtDesc(String userId);

    List<SavedPost> findByUserIdAndPostIdIn(String userId, List<String> postIds);
}
