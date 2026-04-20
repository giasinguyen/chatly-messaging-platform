package com.chatly.repository.mongo;

import com.chatly.model.mongo.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {

    Page<Message> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);

    List<Message> findByConversationIdAndCreatedAtBetweenOrderByCreatedAtAsc(
            String conversationId, Instant from, Instant to, Pageable pageable);
}
