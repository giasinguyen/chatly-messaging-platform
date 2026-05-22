package com.chatly.repository.mongo;

import com.chatly.model.mongo.AdminSettings;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AdminSettingsRepository extends MongoRepository<AdminSettings, String> {
}
