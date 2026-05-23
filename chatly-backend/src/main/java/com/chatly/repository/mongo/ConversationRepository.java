package com.chatly.repository.mongo;

import com.chatly.model.mongo.Conversation;
import com.chatly.model.enums.ConversationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ConversationRepository extends MongoRepository<Conversation, String> {

    Page<Conversation> findAllByOrderByUpdatedAtDesc(Pageable pageable);

    Page<Conversation> findByTypeOrderByUpdatedAtDesc(ConversationType type, Pageable pageable);

    List<Conversation> findByParticipantIdsContaining(String userId);

    List<Conversation> findByParticipantIdsContainingOrderByUpdatedAtDesc(String userId);

    long countByType(ConversationType type);
}
