package com.chatly.service;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.MessageMapper;
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
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final MessageMapper messageMapper;

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

        updateLastMessage(conversation, message);

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

    public MessageResponse markAsRead(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        boolean alreadyRead = message.getReadBy().stream()
                .anyMatch(r -> r.getUserId().equals(userId));

        if (!alreadyRead) {
            message.getReadBy().add(
                    ReadReceipt.builder()
                            .userId(userId)
                            .readAt(Instant.now())
                            .build()
            );
            message = messageRepository.save(message);
        }

        return messageMapper.toResponse(message);
    }

    public void delete(String messageId, String senderId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (!message.getSenderId().equals(senderId)) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        messageRepository.deleteById(messageId);
    }

    private void updateLastMessage(Conversation conversation, Message message) {
        LastMessage lastMessage = LastMessage.builder()
                .senderId(message.getSenderId())
                .content(message.getContent())
                .type(message.getType())
                .timestamp(message.getCreatedAt() != null ? message.getCreatedAt() : Instant.now())
                .build();

        conversation.setLastMessage(lastMessage);
        conversationRepository.save(conversation);
    }
}
