package com.chatly.repository.mongo;

import com.chatly.model.mongo.GroupNote;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GroupNoteRepository extends MongoRepository<GroupNote, String> {

    List<GroupNote> findByConversationIdOrderByPinnedDescCreatedAtDesc(String conversationId);
}
