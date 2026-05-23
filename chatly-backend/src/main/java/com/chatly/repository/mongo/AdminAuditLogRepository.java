package com.chatly.repository.mongo;

import com.chatly.model.mongo.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AdminAuditLogRepository extends MongoRepository<AdminAuditLog, String> {

    Page<AdminAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AdminAuditLog> findByTypeOrderByCreatedAtDesc(String type, Pageable pageable);
}
