package com.chatly.service;

import com.chatly.dto.request.ForwardMessageRequest;
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
import com.chatly.model.mongo.Attachment;
import com.chatly.model.mongo.Reaction;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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
    private static final Set<String> ALLOWED_EMOJIS = Set.of("👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "👏");
        private static final Set<MessageType> FORWARDABLE_TYPES = Set.of(MessageType.TEXT, MessageType.IMAGE, MessageType.FILE);

    public MessageResponse send(String senderId, MessageRequest request) {
                Conversation conversation = getConversationForParticipant(request.getConversationId(), senderId);

        Message message = Message.builder()
                .conversationId(request.getConversationId())
                .senderId(senderId)
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : MessageType.TEXT)
                .replyToId(request.getReplyToId())
                .attachments(request.getAttachments() != null ? request.getAttachments() : new ArrayList<>())
                .build();

        Message savedMessage = persistAndBroadcast(conversation, message, senderId);
        return messageMapper.toResponse(savedMessage);
    }

    public List<MessageResponse> forward(String senderId, ForwardMessageRequest request) {
        Message sourceMessage = messageRepository.findById(request.getMessageId())
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        Conversation sourceConversation = getConversationForParticipant(sourceMessage.getConversationId(), senderId);

        if (sourceMessage.isRecalled()) {
            throw new AppException(ErrorCode.CANNOT_FORWARD_RECALLED_MESSAGE);
        }

        if (!FORWARDABLE_TYPES.contains(sourceMessage.getType())) {
            throw new AppException(ErrorCode.CANNOT_FORWARD_MESSAGE_TYPE);
        }

        List<String> targetConversationIds = sanitizeForwardTargets(sourceConversation.getId(), request.getTargetConversationIds());
        if (targetConversationIds.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_FORWARD_TARGETS);
        }

        List<MessageResponse> forwardedMessages = new ArrayList<>();
        for (String targetConversationId : targetConversationIds) {
            Conversation targetConversation = getConversationForParticipant(targetConversationId, senderId);

            Message forwardedMessage = Message.builder()
                    .conversationId(targetConversationId)
                    .senderId(senderId)
                    .content(sourceMessage.getContent())
                    .type(sourceMessage.getType())
                    .attachments(copyAttachments(sourceMessage.getAttachments()))
                    .build();

            forwardedMessages.add(messageMapper.toResponse(persistAndBroadcast(targetConversation, forwardedMessage, senderId)));
        }

        return forwardedMessages;
    }

    public List<MessageResponse> getByConversation(String conversationId, String userId, int page, int size) {
        getConversationForParticipant(conversationId, userId);

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

    public MessageResponse react(String messageId, String userId, String emoji) {
        if (!ALLOWED_EMOJIS.contains(emoji)) {
            throw new AppException(ErrorCode.INVALID_EMOJI);
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (message.isRecalled()) {
            throw new AppException(ErrorCode.CANNOT_REACT_RECALLED_MESSAGE);
        }

        getConversationForParticipant(message.getConversationId(), userId);

        // Toggle: remove if same emoji exists, otherwise add/replace
        boolean removed = message.getReactions().removeIf(
                r -> r.getUserId().equals(userId) && r.getEmoji().equals(emoji));

        if (!removed) {
            // Remove any existing reaction by this user (1 reaction per user)
            message.getReactions().removeIf(r -> r.getUserId().equals(userId));
            message.getReactions().add(Reaction.builder()
                    .userId(userId)
                    .emoji(emoji)
                    .createdAt(Instant.now())
                    .build());
        }

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(messageId)),
                new Update().set("reactions", message.getReactions()),
                Message.class
        );

        MessageResponse response = messageMapper.toResponse(message);
        broadcastEvent(message.getConversationId(), ChatEvent.ChatAction.REACT, response);
        return response;
    }

    public List<MessageResponse> search(String conversationId, String userId, String keyword, int page, int size) {
        getConversationForParticipant(conversationId, userId);

        String escapedKeyword = java.util.regex.Pattern.quote(keyword);

        Query query = new Query(
                Criteria.where("conversationId").is(conversationId)
                        .and("recalled").is(false)
                        .and("content").regex(escapedKeyword, "i")
        )
                .with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"))
                .skip((long) page * size)
                .limit(size);

        return mongoTemplate.find(query, Message.class).stream()
                .map(messageMapper::toResponse)
                .toList();
    }

    private void broadcastEvent(String conversationId, ChatEvent.ChatAction action, MessageResponse message) {
        messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId,
                ChatEvent.builder().action(action).message(message).build()
        );
    }

        private Conversation getConversationForParticipant(String conversationId, String userId) {
                Conversation conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

                if (!conversation.getParticipantIds().contains(userId)) {
                        throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
                }

                return conversation;
        }

        private Message persistAndBroadcast(Conversation conversation, Message message, String actorId) {
                Message savedMessage = messageRepository.save(message);
                updateLastMessage(conversation.getId(), savedMessage);
                notifyParticipants(conversation, savedMessage, actorId);
                broadcastEvent(conversation.getId(), ChatEvent.ChatAction.SEND, messageMapper.toResponse(savedMessage));
                return savedMessage;
        }

        private void notifyParticipants(Conversation conversation, Message message, String actorId) {
                String notifContent = resolveNotificationContent(message);

                conversation.getParticipantIds().stream()
                                .filter(pid -> !pid.equals(actorId))
                                .forEach(receiverId -> notificationService.createAndPush(
                                                NotificationType.NEW_MESSAGE,
                                                actorId,
                                                receiverId,
                                                notifContent,
                                                message.getConversationId()
                                ));
        }

        private String resolveNotificationContent(Message message) {
                if (message.getContent() != null && !message.getContent().isBlank()) {
                        return message.getContent().length() > 100
                                        ? message.getContent().substring(0, 100) + "..."
                                        : message.getContent();
                }

                return switch (message.getType()) {
                        case IMAGE -> "[Image]";
                        case FILE -> "[File]";
                        case VIDEO -> "[Video]";
                        case AUDIO -> "[Audio]";
                        default -> "[Message]";
                };
        }

        private List<String> sanitizeForwardTargets(String sourceConversationId, List<String> targetConversationIds) {
                if (targetConversationIds == null || targetConversationIds.isEmpty()) {
                        return List.of();
                }

                return targetConversationIds.stream()
                                .filter(targetId -> targetId != null && !targetId.isBlank())
                                .filter(targetId -> !sourceConversationId.equals(targetId))
                                .collect(java.util.stream.Collectors.collectingAndThen(
                                                java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                                                ArrayList::new
                                ));
        }

        private List<Attachment> copyAttachments(List<Attachment> attachments) {
                if (attachments == null || attachments.isEmpty()) {
                        return new ArrayList<>();
                }

                return attachments.stream()
                                .map(attachment -> Attachment.builder()
                                                .fileId(attachment.getFileId())
                                                .fileName(attachment.getFileName())
                                                .fileUrl(attachment.getFileUrl())
                                                .fileType(attachment.getFileType())
                                                .fileSize(attachment.getFileSize())
                                                .build())
                                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
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
