package com.chatly.service;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.MessageMapper;
import com.chatly.model.enums.MessageStatus;
import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Conversation;
import com.chatly.model.mongo.LastMessage;
import com.chatly.model.mongo.Message;
import com.chatly.model.mongo.ReadReceipt;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

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

        // Partial update — chỉ ghi lastMessage + updatedAt, không load/save toàn bộ document
        updateLastMessage(request.getConversationId(), message);

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

        if (message.getSenderId().equals(userId)) {
            return Optional.empty();
        }

        boolean alreadySeen = message.getReadBy().stream()
                .anyMatch(r -> r.getUserId().equals(userId));

        if (!alreadySeen) {
            ReadReceipt receipt = ReadReceipt.builder()
                    .userId(userId)
                    .readAt(Instant.now())
                    .build();

            // Push vào array + set status trong 1 query — không load lại toàn document
            mongoTemplate.updateFirst(
                    Query.query(Criteria.where("_id").is(messageId)),
                    new Update()
                            .push("readBy", receipt)
                            .set("status", MessageStatus.READ),
                    Message.class
            );

            message.getReadBy().add(receipt);
            message.setStatus(MessageStatus.READ);
            return Optional.of(messageMapper.toResponse(message));
        }

        return Optional.empty();
    }

    public void delete(String messageId, String senderId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (!message.getSenderId().equals(senderId)) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        messageRepository.deleteById(messageId);
    }

    // Partial update: chỉ set lastMessage + updatedAt trên Conversation document
    private void updateLastMessage(String conversationId, Message message) {
        LastMessage lastMessage = LastMessage.builder()
                .senderId(message.getSenderId())
                .content(message.getContent())
                .type(message.getType())
                .timestamp(message.getCreatedAt() != null ? message.getCreatedAt() : Instant.now())
                .build();

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(conversationId)),
                new Update()
                        .set("lastMessage", lastMessage)
                        .set("updatedAt", Instant.now()),
                Conversation.class
        );
    }
}
