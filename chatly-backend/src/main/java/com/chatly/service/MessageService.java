package com.chatly.service;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.MessageMapper;
import com.chatly.model.enums.MessageStatus;
import com.chatly.model.enums.MessageType;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.mongo.Conversation;
import com.chatly.model.mongo.EditHistory;
import com.chatly.model.mongo.LastMessage;
import com.chatly.model.mongo.Message;
import com.chatly.model.mongo.ReadReceipt;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.MessageRepository;
import com.chatly.websocket.ChatEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final MessageMapper messageMapper;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    private static final long RECALL_LIMIT_HOURS = 24;
    private static final long EDIT_LIMIT_MINUTES = 15;

    public MessageResponse send(String senderId, MessageRequest request) {
        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(senderId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        Message message = Message.builder()
                .conversationId(request.getConversationId())
                .senderId(senderId)
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : MessageType.TEXT)
                .replyToId(request.getReplyToId())
                .attachments(request.getAttachments() != null ? request.getAttachments() : new ArrayList<>())
                .build();

        message = messageRepository.save(message);
        updateLastMessage(request.getConversationId(), message);

        // Notify all conversation participants except the sender
        final Message savedMessage = message;
        String notifContent = savedMessage.getContent() != null && savedMessage.getContent().length() > 100
                ? savedMessage.getContent().substring(0, 100) + "..."
                : savedMessage.getContent();
        conversation.getParticipantIds().stream()
                .filter(pid -> !pid.equals(senderId))
                .forEach(receiverId -> notificationService.createAndPush(
                        NotificationType.NEW_MESSAGE,
                        senderId,
                        receiverId,
                        notifContent,
                        savedMessage.getConversationId()
                ));

        return messageMapper.toResponse(message);
    }

    public List<MessageResponse> getByConversation(String conversationId, String userId, int page, int size) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        Page<Message> messages = messageRepository
                .findByConversationIdOrderByCreatedAtDesc(conversationId, PageRequest.of(page, size));

        return messages.getContent().stream()
                .map(messageMapper::toResponse)
                .toList();
    }

    public Optional<MessageResponse> markAsSeen(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (message.getSenderId().equals(userId)) return Optional.empty();

        boolean alreadySeen = message.getReadBy().stream()
                .anyMatch(r -> r.getUserId().equals(userId));

        if (!alreadySeen) {
            ReadReceipt receipt = ReadReceipt.builder()
                    .userId(userId)
                    .readAt(Instant.now())
                    .build();

            mongoTemplate.updateFirst(
                    Query.query(Criteria.where("_id").is(messageId)),
                    new Update().push("readBy", receipt).set("status", MessageStatus.READ),
                    Message.class
            );

            message.getReadBy().add(receipt);
            message.setStatus(MessageStatus.READ);
            return Optional.of(messageMapper.toResponse(message));
        }
        return Optional.empty();
    }

    public MessageResponse recall(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (!message.getSenderId().equals(userId)) {
            throw new AppException(ErrorCode.CANNOT_RECALL_OTHERS_MESSAGE);
        }

        if (message.getType() == MessageType.SYSTEM) {
            throw new AppException(ErrorCode.CANNOT_RECALL_SYSTEM_MESSAGE);
        }

        if (message.isRecalled()) {
            throw new AppException(ErrorCode.MESSAGE_ALREADY_RECALLED);
        }

        Instant now = Instant.now();
        if (message.getCreatedAt() != null &&
                Duration.between(message.getCreatedAt(), now).toHours() >= RECALL_LIMIT_HOURS) {
            throw new AppException(ErrorCode.RECALL_TIME_EXCEEDED);
        }

        // Atomic conditional update to handle race conditions
        var result = mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(messageId).and("recalled").is(false)),
                new Update().set("recalled", true).set("recalledAt", now).set("recalledBy", userId),
                Message.class
        );

        if (result.getMatchedCount() == 0) {
            throw new AppException(ErrorCode.MESSAGE_ALREADY_RECALLED);
        }

        message.setRecalled(true);
        message.setRecalledAt(now);
        message.setRecalledBy(userId);

        MessageResponse response = messageMapper.toResponse(message);
        broadcastEvent(message.getConversationId(), ChatEvent.ChatAction.RECALL, response);
        return response;
    }

    public MessageResponse edit(String messageId, String userId, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (!message.getSenderId().equals(userId)) {
            throw new AppException(ErrorCode.CANNOT_EDIT_OTHERS_MESSAGE);
        }

        if (message.getType() != MessageType.TEXT) {
            throw new AppException(ErrorCode.CANNOT_EDIT_NON_TEXT);
        }

        if (message.isRecalled()) {
            throw new AppException(ErrorCode.MESSAGE_ALREADY_RECALLED);
        }

        Instant now = Instant.now();
        if (message.getCreatedAt() != null &&
                Duration.between(message.getCreatedAt(), now).toMinutes() >= EDIT_LIMIT_MINUTES) {
            throw new AppException(ErrorCode.EDIT_TIME_EXCEEDED);
        }

        EditHistory history = EditHistory.builder()
                .content(message.getContent())
                .editedAt(now)
                .build();

        // Atomic conditional update (cannot edit recalled messages – race condition guard)
        var result = mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(messageId).and("recalled").is(false)),
                new Update()
                        .set("content", newContent)
                        .set("edited", true)
                        .set("editedAt", now)
                        .push("editHistory", history),
                Message.class
        );

        if (result.getMatchedCount() == 0) {
            throw new AppException(ErrorCode.MESSAGE_ALREADY_RECALLED);
        }

        message.setContent(newContent);
        message.setEdited(true);
        message.setEditedAt(now);
        message.getEditHistory().add(history);

        MessageResponse response = messageMapper.toResponse(message);
        broadcastEvent(message.getConversationId(), ChatEvent.ChatAction.EDIT, response);
        return response;
    }

    public void delete(String messageId, String senderId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (!message.getSenderId().equals(senderId)) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        MessageResponse response = messageMapper.toResponse(message);
        messageRepository.deleteById(messageId);
        broadcastEvent(message.getConversationId(), ChatEvent.ChatAction.DELETE, response);
    }

    private void broadcastEvent(String conversationId, ChatEvent.ChatAction action, MessageResponse message) {
        messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId,
                ChatEvent.builder().action(action).message(message).build()
        );
    }

    private void updateLastMessage(String conversationId, Message message) {
        LastMessage lastMessage = LastMessage.builder()
                .senderId(message.getSenderId())
                .content(message.getContent())
                .type(message.getType())
                .timestamp(message.getCreatedAt() != null ? message.getCreatedAt() : Instant.now())
                .build();

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(conversationId)),
                new Update().set("lastMessage", lastMessage).set("updatedAt", Instant.now()),
                Conversation.class
        );
    }
}
