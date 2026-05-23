package com.chatly.repository.mongo;

import com.chatly.model.enums.ReportStatus;
import com.chatly.model.mongo.UserReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserReportRepository extends MongoRepository<UserReport, String> {

    boolean existsByReporterIdAndReportedUserId(String reporterId, String reportedUserId);

    Page<UserReport> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<UserReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);
}
