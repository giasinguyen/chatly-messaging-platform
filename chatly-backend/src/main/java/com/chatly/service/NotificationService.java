package com.chatly.service;

import com.chatly.dto.response.NotificationResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.NotificationMapper;
import com.chatly.model.enums.NotificationScope;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.mongo.Notification;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.NotificationRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.websocket.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.UUID;
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
    private final UserRepository userRepository;
    private final ExpoPushService expoPushService;

    /**
     * Create a notification and push it via WebSocket.
     */
    public void createAndPush(NotificationType type,
                              String senderId,
                              String receiverId,
                              String content,
                              String referenceId) {
        if (senderId != null && senderId.equals(receiverId)) return;

        Notification notification;
        var existing = notificationRepository
                .findByReceiverIdAndTypeAndReferenceIdAndReadFalse(receiverId, type, referenceId);

        if (existing.isPresent()) {
            notification = existing.get();
            notification.setContent(content);
            notification = notificationRepository.save(notification);
        } else {
            notification = Notification.builder()
                    .type(type)
                    .senderId(senderId)
                    .receiverId(receiverId)
                    .referenceId(referenceId)
                    .content(content)
                    .build();
            notification = notificationRepository.save(notification);
        }

        NotificationResponse response = toResponse(notification);
        long totalUnreadCount = notificationRepository.countByReceiverIdAndReadFalse(receiverId);

        pushToUser(receiverId, response, totalUnreadCount);
    }

    public List<NotificationResponse> getNotifications(
            String userId, int page, int size, NotificationScope scope) {
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Notification> result = scope == NotificationScope.ALL
                ? notificationRepository.findByReceiverIdOrderByCreatedAtDesc(userId, pageRequest)
                : notificationRepository.findByReceiverIdAndTypeInOrderByCreatedAtDesc(
                        userId, scope.getTypes(), pageRequest);
        return result.getContent().stream()
                .map(this::toResponse)
                .toList();
    }

    public long getUnreadCount(String userId, NotificationScope scope) {
        return scope == NotificationScope.ALL
                ? notificationRepository.countByReceiverIdAndReadFalse(userId)
                : notificationRepository.countByReceiverIdAndTypeInAndReadFalse(userId, scope.getTypes());
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

        return toResponse(notification);
    }

    public void markAllAsRead(String userId, NotificationScope scope) {
        Criteria criteria = Criteria.where("receiverId").is(userId).and("read").is(false);
        if (scope != NotificationScope.ALL) {
            criteria.and("type").in(scope.getTypes());
        }

        mongoTemplate.updateMulti(
                Query.query(criteria),
                new Update().set("read", true),
                Notification.class
        );
    }

    private NotificationResponse toResponse(Notification notification) {
        NotificationResponse response = notificationMapper.toResponse(notification);
        if (notification.getSenderId() != null) {
            try {
                userRepository.findById(UUID.fromString(notification.getSenderId())).ifPresent(user -> {
                    response.setSenderName(user.getDisplayName());
                    response.setSenderAvatar(user.getAvatarUrl());
                });
            } catch (Exception e) {
                // Ignore if senderId is not a valid UUID
            }
        }
        return response;
    }

    private void pushToUser(String userId, NotificationResponse notification, long unreadCount) {
        try {
            log.info("Pushing notification to user {}: unreadCount={}", userId, unreadCount);
            
            messagingTemplate.convertAndSendToUser(
                    userId,
                    "/queue/notifications",
                    NotificationEvent.builder()
                            .notification(notification)
                            .unreadCount(unreadCount)
                            .build()
            );

            // Also send Push Notification if user has device tokens
            try {
                UUID uuid = UUID.fromString(userId);
                userRepository.findById(uuid).ifPresent(user -> {
                    if (user.getDeviceTokens() != null && !user.getDeviceTokens().isEmpty()) {
                        String title = "Chatly Notification";
                        if (notification.getType() == NotificationType.NEW_MESSAGE) {
                            title = "New message";
                        } else if (notification.getType() == NotificationType.MENTION) {
                            title = "You were mentioned";
                        } else if (notification.getType() == NotificationType.NEW_FOLLOWER) {
                            title = "New follower";
                        } else if (notification.getType() == NotificationType.FRIEND_REQUEST) {
                            title = "Friend request";
                        } else if (notification.getType() == NotificationType.FRIEND_ACCEPTED) {
                            title = "Friend request accepted";
                        } else if (notification.getType() == NotificationType.GROUP_JOIN_REQUEST) {
                            title = "New join request";
                        } else if (notification.getType() == NotificationType.MEMBER_JOINED) {
                            title = "New member joined";
                        } else if (notification.getType() == NotificationType.CALL_MISSED) {
                            title = "Missed call";
                        } else if (notification.getType() == NotificationType.POST_LIKED) {
                            title = "Someone liked your post";
                        } else if (notification.getType() == NotificationType.POST_COMMENTED) {
                            title = "New comment on your post";
                        } else if (notification.getType() == NotificationType.POST_SHARED) {
                            title = "Someone shared your post";
                        } else if (notification.getType() == NotificationType.POST_MENTION) {
                            title = "You were mentioned in a post";
                        } else if (notification.getType() == NotificationType.COMMENT_REPLIED) {
                            title = "New reply to your comment";
                        } else if (notification.getType() == NotificationType.STORY_VIEWED) {
                            title = "Someone viewed your story";
                        } else if (notification.getType() == NotificationType.STORY_REACTED) {
                            title = "Someone reacted to your story";
                        } else if (notification.getType() == NotificationType.STORY_REPLIED) {
                            title = "Someone replied to your story";
                        }
                        
                        Map<String, Object> data = Map.of(
                            "type", notification.getType().toString(),
                            "referenceId", notification.getReferenceId() != null ? notification.getReferenceId() : "",
                            "notificationId", notification.getId() != null ? notification.getId() : ""
                        );

                        expoPushService.sendPushNotification(
                            user.getDeviceTokens(),
                            title,
                            notification.getContent(),
                            data
                        );
                    }
                });
            } catch (IllegalArgumentException e) {
                log.warn("UserId {} is not a valid UUID, skipping push notification", userId);
            }
        } catch (Exception e) {
            log.error("Failed to push notification to user {}: {}", userId, e.getMessage(), e);
        }
    }
}
