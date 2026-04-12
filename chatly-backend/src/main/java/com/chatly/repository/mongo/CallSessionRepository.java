package com.chatly.repository.mongo;

import com.chatly.model.mongo.CallSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CallSessionRepository extends MongoRepository<CallSession, String> {

    List<CallSession> findByConversationIdOrderByStartedAtDesc(String conversationId);

    Optional<CallSession> findByCallId(String callId);
}
