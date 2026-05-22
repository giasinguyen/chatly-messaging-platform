package com.chatly.repository.mongo;

import com.chatly.model.mongo.UserReport;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserReportRepository extends MongoRepository<UserReport, String> {

    boolean existsByReporterIdAndReportedUserId(String reporterId, String reportedUserId);
}
