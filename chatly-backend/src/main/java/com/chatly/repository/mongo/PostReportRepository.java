package com.chatly.repository.mongo;

import com.chatly.model.enums.ReportStatus;
import com.chatly.model.mongo.PostReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PostReportRepository extends MongoRepository<PostReport, String> {

    Page<PostReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);

    Page<PostReport> findByPostIdOrderByCreatedAtDesc(String postId, Pageable pageable);
}
