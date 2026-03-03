package com.chatly.repository.mongo;

import com.chatly.model.mongo.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MessageRepository extends MongoRepository<Message, String> {
}
