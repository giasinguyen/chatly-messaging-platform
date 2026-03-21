package com.chatly.service;

import com.chatly.dto.response.NotificationResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.NotificationMapper;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.mongo.Notification;
import com.chatly.repository.mongo.NotificationRepository;
import com.chatly.websocket.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Create a notification and push it via WebSocket.
     * Skips if the receiver is the same as the sender.
     * Skips if an identical unread notification already exists (deduplication).
     */
    public void createAndPush(NotificationType type,
                              String senderId,
                              String receiverId,
                              String content,
                              String referenceId) {
        if (senderId != null && senderId.equals(receiverId)) return;

        // Deduplication: skip if an unread notification already exists for same (receiver, type, referenceId)
        if (referenceId != null &&
            notificationRepository
                .findByReceiverIdAndTypeAndReferenceIdAndReadFalse(receiverId, type, referenceId)
                .isPresent()) {
            return;
        }

        Notification notification = Notification.builder()
                .type(type)
                .senderId(senderId)
                .receiverId(receiverId)
                .referenceId(referenceId)
                .content(content)
                .build();

        notification = notificationRepository.save(notification);

        NotificationResponse response = notificationMapper.toResponse(notification);
        long unreadCount = notificationRepository.countByReceiverIdAndReadFalse(receiverId);

        pushToUser(receiverId, response, unreadCount);
    }

    public List<NotificationResponse> getNotifications(String userId, int page, int size) {
        Page<Notification> result = notificationRepository
                .findByReceiverIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
        return result.getContent().stream()
                .map(notificationMapper::toResponse)
                .toList();
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByReceiverIdAndReadFalse(userId);
    }

    public NotificationResponse markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));

        if (!notification.getReceiverId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }

        return notificationMapper.toResponse(notification);
    }

    public void markAllAsRead(String userId) {
        mongoTemplate.updateMulti(
                Query.query(Criteria.where("receiverId").is(userId).and("read").is(false)),
                new Update().set("read", true),
                Notification.class
        );
    }

    private void pushToUser(String userId, NotificationResponse notification, long unreadCount) {
        try {
            messagingTemplate.convertAndSendToUser(
                    userId,
                    "/queue/notifications",
                    NotificationEvent.builder()
                            .notification(notification)
                            .unreadCount(unreadCount)
                            .build()
            );
        } catch (Exception e) {
            log.warn("Failed to push notification to user {}: {}", userId, e.getMessage());
        }
    }
}
