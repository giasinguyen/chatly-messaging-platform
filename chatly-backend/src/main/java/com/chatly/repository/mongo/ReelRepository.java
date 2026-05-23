package com.chatly.repository.mongo;

import com.chatly.model.mongo.Reel;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ReelRepository extends MongoRepository<Reel, String>, ReelRepositoryCustom {
}
