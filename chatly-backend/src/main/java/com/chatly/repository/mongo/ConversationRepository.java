package com.chatly.repository.mongo;

import com.chatly.model.mongo.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ConversationRepository extends MongoRepository<Conversation, String> {
}
