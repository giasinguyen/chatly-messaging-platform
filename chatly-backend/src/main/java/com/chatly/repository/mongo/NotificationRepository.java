package com.chatly.repository.mongo;

import com.chatly.model.enums.NotificationType;
import com.chatly.model.mongo.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findByReceiverIdOrderByCreatedAtDesc(String receiverId, Pageable pageable);

    long countByReceiverIdAndReadFalse(String receiverId);

    /** For deduplication: check if an unread notification already exists for the same receiver + type + referenceId */
    Optional<Notification> findByReceiverIdAndTypeAndReferenceIdAndReadFalse(
            String receiverId, NotificationType type, String referenceId);
}
