package com.chatly.repository.mongo;

import com.chatly.model.mongo.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MessageRepository extends MongoRepository<Message, String> {

    Page<Message> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);
}
