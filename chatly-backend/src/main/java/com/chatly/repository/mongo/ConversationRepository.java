package com.chatly.repository.mongo;

import com.chatly.model.mongo.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ConversationRepository extends MongoRepository<Conversation, String> {

    List<Conversation> findByParticipantIdsContaining(String userId);

    List<Conversation> findByParticipantIdsContainingOrderByUpdatedAtDesc(String userId);
}
