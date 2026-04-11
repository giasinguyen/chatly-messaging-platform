package com.chatly.repository.mongo;

import com.chatly.model.mongo.PendingJoinRequest;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PendingJoinRequestRepository extends MongoRepository<PendingJoinRequest, String> {

    List<PendingJoinRequest> findByConversationId(String conversationId);

    Optional<PendingJoinRequest> findByConversationIdAndUserId(String conversationId, String userId);

    boolean existsByConversationIdAndUserId(String conversationId, String userId);

    void deleteByConversationIdAndUserId(String conversationId, String userId);
}
