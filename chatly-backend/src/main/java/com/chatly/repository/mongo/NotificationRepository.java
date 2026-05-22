package com.chatly.repository.mongo;

import com.chatly.model.enums.NotificationType;
import com.chatly.model.mongo.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.Optional;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Notification> findByTypeInOrderByCreatedAtDesc(
            Collection<NotificationType> types, Pageable pageable);

    Page<Notification> findByReadOrderByCreatedAtDesc(boolean read, Pageable pageable);

    Page<Notification> findByTypeInAndReadOrderByCreatedAtDesc(
            Collection<NotificationType> types, boolean read, Pageable pageable);

    long countByReadFalse();

    Page<Notification> findByReceiverIdOrderByCreatedAtDesc(String receiverId, Pageable pageable);

    Page<Notification> findByReceiverIdAndTypeInOrderByCreatedAtDesc(
            String receiverId, Collection<NotificationType> types, Pageable pageable);

    long countByReceiverIdAndReadFalse(String receiverId);

    long countByReceiverIdAndTypeInAndReadFalse(String receiverId, Collection<NotificationType> types);

    long countByReceiverIdAndTypeAndReferenceIdAndReadFalse(
            String receiverId, NotificationType type, String referenceId);

    /** For deduplication: check if an unread notification already exists for the same receiver + type + referenceId */
    Optional<Notification> findByReceiverIdAndTypeAndReferenceIdAndReadFalse(
            String receiverId, NotificationType type, String referenceId);
}
