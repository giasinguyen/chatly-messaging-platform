package com.chatly.repository.mongo;

import com.chatly.model.mongo.GroupReminder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GroupReminderRepository extends MongoRepository<GroupReminder, String> {

    List<GroupReminder> findByConversationIdOrderByRemindAtAsc(String conversationId);
}
