package com.chatly.service;

import com.chatly.dto.request.ForwardMessageRequest;
import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.MessageMapper;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.CallStatus;
import com.chatly.model.enums.CallType;
import com.chatly.model.enums.MessageStatus;
import com.chatly.model.enums.MessageType;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.mongo.Conversation;
import com.chatly.model.mongo.EditHistory;
import com.chatly.model.mongo.LastMessage;
import com.chatly.model.mongo.Message;
import com.chatly.model.mongo.Attachment;
import com.chatly.model.mongo.Poll;
import com.chatly.model.mongo.Reaction;
import com.chatly.model.mongo.ReadReceipt;
import com.chatly.proxy.AgentProxyClient;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.MessageRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.websocket.ChatEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final MessageMapper messageMapper;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final ContactService contactService;
    private final UserSettingsService userSettingsService;
    private final UserRepository userRepository;
    private final AgentProxyClient agentProxyClient;
    private final TaskScheduler taskScheduler;

    private static final long RECALL_LIMIT_HOURS = 24;
    private static final long EDIT_LIMIT_MINUTES = 15;
    private static final int MAX_MESSAGES_PER_RANGE = 100;
    private static final String AI_MENTION_TRIGGER = "@AI";
    private static final long UNANSWERED_CHECK_DELAY_S = 1800;
    private static final String AI_TYPING_USER_ID = "AI";
    private static final long AI_TYPING_TIMEOUT_S = 120;
    private static final Set<String> ALLOWED_EMOJIS = Set.of("👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "👏");
        private static final Set<MessageType> FORWARDABLE_TYPES = Set.of(MessageType.TEXT, MessageType.IMAGE, MessageType.FILE, MessageType.GIF, MessageType.STICKER);

    private static final Set<String> ALLOWED_PRIORITIES = Set.of("IMPORTANT", "URGENT");

    public MessageResponse send(String senderId, MessageRequest request) {
        Conversation conversation = getConversationForParticipant(request.getConversationId(), senderId);

        // Resolve other participant for PRIVATE conversation guards
        String otherId = null;
        if (conversation.getType() == ConversationType.PRIVATE) {
            otherId = conversation.getParticipantIds().stream()
                    .filter(id -> !id.equals(senderId))
                    .findFirst()
                    .orElse(null);
            // Block guard: reject if either user has blocked the other
            if (otherId != null && contactService.isBlocked(UUID.fromString(senderId), UUID.fromString(otherId))) {
                throw new AppException(ErrorCode.CONTACT_BLOCKED);
            }

            // Suspension guard: reject if recipient account is suspended
            if (otherId != null) {
                boolean recipientSuspended = userRepository.findById(UUID.fromString(otherId))
                        .map(user -> user.isSuspended())
                        .orElse(false);
                if (recipientSuspended) {
                    throw new AppException(ErrorCode.CONTACT_SUSPENDED);
                }
            }
        }

        Message message = Message.builder()
                .conversationId(request.getConversationId())
                .senderId(senderId)
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : MessageType.TEXT)
                .replyToId(request.getReplyToId())
                .attachments(request.getAttachments() != null ? request.getAttachments() : new ArrayList<>())
                .poll(request.getPoll())
                .location(request.getLocation())
                .priority(request.getPriority() != null && ALLOWED_PRIORITIES.contains(request.getPriority()) ? request.getPriority() : null)
                .mentions(request.getMentions() != null ? request.getMentions() : new ArrayList<>())
                .build();

        Message savedMessage = persistAndBroadcast(conversation, message, senderId);

        // Send mention notifications (separate from normal notifications)
        if (message.getMentions() != null && !message.getMentions().isEmpty()) {
            notifyMentionedUsers(conversation, savedMessage, senderId);
        }

        // Trigger AI assist when a GROUP message contains the @AI mention and the feature is enabled
        if (conversation.getType() == ConversationType.GROUP
                && Boolean.TRUE.equals(conversation.getAiProactiveEnabled())
                && isAiMention(request.getContent())) {
            broadcastAiTyping(conversation.getId(), true);
            scheduleAiTypingTimeout(conversation.getId());
            agentProxyClient.triggerAssistAsync(conversation.getId(), senderId, request.getContent());
        }

        // Schedule an unanswered-question check: if nobody replies after 30 min, trigger AI
        if (conversation.getType() == ConversationType.GROUP
                && Boolean.TRUE.equals(conversation.getAiProactiveEnabled())
                && isQuestion(request.getContent())) {
            scheduleUnansweredCheck(conversation.getId(), savedMessage.getId(), senderId);
        }

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

    public List<MessageResponse> getByConversationAndTimeRange(
            String conversationId, String userId, Instant from, Instant to) {
        getConversationForParticipant(conversationId, userId);

        List<Message> messages = messageRepository
                .findByConversationIdAndCreatedAtBetweenOrderByCreatedAtAsc(
                        conversationId, from, to, PageRequest.of(0, MAX_MESSAGES_PER_RANGE));

        return messages.stream()
                .map(messageMapper::toResponse)
                .toList();
    }

    public Optional<MessageResponse> markAsSeen(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (message.getSenderId().equals(userId)) return Optional.empty();
        if (!userSettingsService.isReadReceiptVisible(userId)) return Optional.empty();

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

    // ── Poll Vote ────────────────────────────────────────────────────
    public MessageResponse votePoll(String messageId, String userId, int optionIndex) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (message.getType() != MessageType.POLL || message.getPoll() == null) {
            throw new AppException(ErrorCode.POLL_NOT_FOUND);
        }

        Conversation conversation = conversationRepository.findById(message.getConversationId())
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        Poll poll = message.getPoll();
        if (optionIndex < 0 || optionIndex >= poll.getOptions().size()) {
            throw new AppException(ErrorCode.POLL_INVALID_OPTION);
        }

        String key = String.valueOf(optionIndex);

        if (!Boolean.TRUE.equals(poll.getMultipleChoice())) {
            // Remove previous votes by this user
            poll.getVotes().values().forEach(voters -> voters.remove(userId));
        }

        List<String> voters = poll.getVotes().computeIfAbsent(key, k -> new ArrayList<>());
        if (voters.contains(userId)) {
            voters.remove(userId); // toggle off
        } else {
            voters.add(userId);
        }

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(messageId)),
                new Update().set("poll", poll),
                Message.class
        );

        MessageResponse response = messageMapper.toResponse(message);
        broadcastEvent(message.getConversationId(), ChatEvent.ChatAction.EDIT, response);

        // Broadcast system message for poll vote
        if (Boolean.TRUE.equals(poll.getAnonymous())) {
            sendSystemMessage(message.getConversationId(), "An anonymous user has voted");
        } else {
            String voterName = userRepository.findById(UUID.fromString(userId))
                    .map(u -> u.getDisplayName())
                    .orElse("Someone");
            sendSystemMessage(message.getConversationId(), voterName + " has voted in the poll");
        }

        return response;
    }

    // ── Close Poll ───────────────────────────────────────────────
    public MessageResponse closePoll(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        if (message.getType() != MessageType.POLL || message.getPoll() == null) {
            throw new AppException(ErrorCode.POLL_NOT_FOUND);
        }

        if (!message.getSenderId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        Poll poll = message.getPoll();
        poll.setClosed(true);

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(messageId)),
                new Update().set("poll.closed", true),
                Message.class
        );

        MessageResponse response = messageMapper.toResponse(message);
        broadcastEvent(message.getConversationId(), ChatEvent.ChatAction.EDIT, response);
        return response;
    }

    // ── Pin / Unpin Message ────────────────────────────────────────
    public MessageResponse togglePin(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        Conversation conversation = conversationRepository.findById(message.getConversationId())
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        boolean newPinned = !message.isPinned();
        Instant now = Instant.now();

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(messageId)),
                new Update()
                        .set("pinned", newPinned)
                        .set("pinnedAt", newPinned ? now : null)
                        .set("pinnedBy", newPinned ? userId : null),
                Message.class
        );

        message.setPinned(newPinned);
        message.setPinnedAt(newPinned ? now : null);
        message.setPinnedBy(newPinned ? userId : null);

        MessageResponse response = messageMapper.toResponse(message);
        broadcastEvent(message.getConversationId(), ChatEvent.ChatAction.EDIT, response);
        return response;
    }

    public List<MessageResponse> getPinnedMessages(String conversationId, String userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        Query query = new Query(
                Criteria.where("conversationId").is(conversationId)
                        .and("pinned").is(true)
        ).with(org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "pinnedAt"
        ));

        return mongoTemplate.find(query, Message.class).stream()
                .map(messageMapper::toResponse)
                .toList();
    }

    // ── Tag Priority (Important / Urgent) ─────────────────────────
    public MessageResponse tagPriority(String messageId, String userId, String priority) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new AppException(ErrorCode.MESSAGE_NOT_FOUND));

        getConversationForParticipant(message.getConversationId(), userId);

        if (message.isRecalled()) {
            throw new AppException(ErrorCode.MESSAGE_ALREADY_RECALLED);
        }

        // Toggle: if same priority, remove it; otherwise set new priority
        String newPriority = priority.equals(message.getPriority()) ? null : priority;

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(messageId)),
                new Update().set("priority", newPriority),
                Message.class
        );

        message.setPriority(newPriority);
        MessageResponse response = messageMapper.toResponse(message);
        broadcastEvent(message.getConversationId(), ChatEvent.ChatAction.EDIT, response);
        return response;
    }

    /**
     * Send an AI-generated response message to a group conversation.
     * The message is attributed to the requesting user but typed as AGENT.
     * Stops the AI typing indicator and does NOT re-trigger AI processing.
     */
    public MessageResponse sendAiMessage(String onBehalfOfUserId, String conversationId, String content) {
        return sendAiMessage(onBehalfOfUserId, conversationId, content, List.of());
    }

    public MessageResponse sendAiMessage(String onBehalfOfUserId, String conversationId, String content, List<String> imageUrls) {
        Conversation conversation = getConversationForParticipant(conversationId, onBehalfOfUserId);

        broadcastAiTyping(conversationId, false);

        List<Attachment> attachments = new ArrayList<>();
        if (imageUrls != null && !imageUrls.isEmpty()) {
            int imageCounter = 1;
            for (String url : imageUrls) {
                if (url == null || url.isBlank()) {
                    continue;
                }
                attachments.add(Attachment.builder()
                        .kind("image")
                        .name("ai-image-" + imageCounter + ".png")
                        .url(url)
                        .type("image/png")
                        .build());
                imageCounter++;
            }
        }

        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId(onBehalfOfUserId)
                .content(content != null ? content : "")
                .type(MessageType.AGENT)
                .attachments(attachments)
                .build();

        Message savedMessage = persistAndBroadcast(conversation, message, onBehalfOfUserId);
        return messageMapper.toResponse(savedMessage);
    }

    private void broadcastAiTyping(String conversationId, boolean typing) {
        Object payload = Map.of("userId", AI_TYPING_USER_ID, "typing", typing);
        messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId + ".typing",
                payload
        );
    }

    private void scheduleAiTypingTimeout(String conversationId) {
        taskScheduler.schedule(
                () -> {
                    broadcastAiTyping(conversationId, false);
                    log.warn("AI typing timeout reached for conversation={}", conversationId);
                },
                Instant.now().plusSeconds(AI_TYPING_TIMEOUT_S)
        );
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

                // Clear per-user deletions so conversation reappears for all participants
                if (conversation.getDeletedBy() != null && !conversation.getDeletedBy().isEmpty()) {
                        conversation.getDeletedBy().clear();
                        conversationRepository.save(conversation);
                }

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
                if (message.getType() == MessageType.CALL) {
                        // Content is JSON - return human-readable text instead
                        String content = message.getContent() != null ? message.getContent() : "";
                        if (content.contains("MISSED")) return "📵 Cuộc gọi nhỡ";
                        if (content.contains("REJECTED")) return "📵 Cuộc gọi bị từ chối";
                        if (content.contains("VIDEO")) return "🎥 Cuộc gọi video";
                        return "📞 Cuộc gọi thoại";
                }

            switch (message.getType()) {
                case GIF:
                    return "[GIF]";
                case STICKER:
                    return "[Sticker]";
                case IMAGE:
                    return "[Image]";
                case FILE:
                    return "[File]";
                case VIDEO:
                    return "[Video]";
                case AUDIO:
                    return "[Audio]";
                case LOCATION:
                    return "[Location]";
                case AGENT:
                    return "[AI Response]";
                default:
                    break;
            }

                if (message.getContent() != null && !message.getContent().isBlank()) {
                        return message.getContent().length() > 100
                                        ? message.getContent().substring(0, 100) + "..."
                                        : message.getContent();
                }

            return "[Message]";
        }

        /**
         * Lưu tin nhắn hệ thống cuộc gọi vào lịch sử chat.
         * Gọi từ CallWebSocketController sau khi cuộc gọi kết thúc/nhỡ/từ chối.
         */
        public void saveCallMessage(String conversationId, String initiatorId, CallType callType, CallStatus callStatus, long durationSeconds) {
                saveCallMessage(conversationId, initiatorId, callType, callStatus, durationSeconds, null);
        }

        /**
         * Lưu tin nhắn cuộc gọi có callId (cho group call "tap to join" message).
         */
        public void saveCallMessage(String conversationId, String initiatorId, CallType callType, CallStatus callStatus, long durationSeconds, String callId) {
                conversationRepository.findById(conversationId).ifPresent(conversation -> {
                        String content;
                        if (callId != null) {
                                content = String.format(
                                        "{\"callType\":\"%s\",\"status\":\"%s\",\"duration\":%d,\"callId\":\"%s\"}",
                                        callType.name(), callStatus.name(), durationSeconds, callId
                                );
                        } else {
                                content = String.format(
                                        "{\"callType\":\"%s\",\"status\":\"%s\",\"duration\":%d}",
                                        callType.name(), callStatus.name(), durationSeconds
                                );
                        }
                        Message message = Message.builder()
                                .conversationId(conversationId)
                                .senderId(initiatorId)
                                .content(content)
                                .type(MessageType.CALL)
                                .build();
                        persistAndBroadcast(conversation, message, initiatorId);
                });
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
                                                .kind(attachment.getKind())
                                                .name(attachment.getName())
                                                .url(attachment.getUrl())
                                                .type(attachment.getType())
                                                .size(attachment.getSize())
                                                .durationSeconds(attachment.getDurationSeconds())
                                                .postId(attachment.getPostId())
                                                .postTitle(attachment.getPostTitle())
                                                .postExcerpt(attachment.getPostExcerpt())
                                                .postImageUrl(attachment.getPostImageUrl())
                                                .postAuthorName(attachment.getPostAuthorName())
                                                .postAuthorAvatarUrl(attachment.getPostAuthorAvatarUrl())
                                                .targetUrl(attachment.getTargetUrl())
                                                .reelId(attachment.getReelId())
                                                .reelCaption(attachment.getReelCaption())
                                                .reelVideoUrl(attachment.getReelVideoUrl())
                                                .reelAuthorName(attachment.getReelAuthorName())
                                                .reelAuthorAvatarUrl(attachment.getReelAuthorAvatarUrl())
                                                .storyId(attachment.getStoryId())
                                                .storyType(attachment.getStoryType())
                                                .storyMediaUrl(attachment.getStoryMediaUrl())
                                                .storyContent(attachment.getStoryContent())
                                                .storyOwnerName(attachment.getStoryOwnerName())
                                                .storyOwnerAvatarUrl(attachment.getStoryOwnerAvatarUrl())
                                                .build())
                                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        }

    private static boolean isAiMention(String content) {
        return content != null && content.contains(AI_MENTION_TRIGGER);
    }

    private static boolean isQuestion(String content) {
        if (content == null || content.isBlank()) return false;
        String lower = content.toLowerCase();
        return content.contains("?")
                || lower.startsWith("how ")
                || lower.startsWith("what ")
                || lower.startsWith("when ")
                || lower.startsWith("where ")
                || lower.startsWith("why ")
                || lower.startsWith("who ")
                || lower.startsWith("can ")
                || lower.startsWith("could ")
                || lower.startsWith("should ");
    }

    private void scheduleUnansweredCheck(String conversationId, String messageId, String senderId) {
        Instant checkAt = Instant.now().plusSeconds(UNANSWERED_CHECK_DELAY_S);
        taskScheduler.schedule(
                () -> checkAndTriggerIfUnanswered(conversationId, messageId, senderId),
                checkAt
        );
    }

    private void checkAndTriggerIfUnanswered(String conversationId, String messageId, String senderId) {
        try {
            Message triggerMessage = messageRepository.findById(messageId).orElse(null);
            if (triggerMessage == null) return;

            // Count messages sent in the conversation AFTER the original question
            long replyCount = messageRepository
                    .countByConversationIdAndCreatedAtAfterAndSenderIdNot(
                            conversationId, triggerMessage.getCreatedAt(), senderId);

            if (replyCount == 0) {
                String prompt = "An unanswered question was posted 30 minutes ago: \""
                        + triggerMessage.getContent()
                        + "\"\nPlease help answer or suggest who in the group might know.";
                agentProxyClient.triggerAssistAsync(conversationId, senderId, prompt);
            }
        } catch (Exception e) {
            log.warn("Unanswered question check failed for message={}: {}", messageId, e.getMessage());
        }
    }

    private void notifyMentionedUsers(Conversation conversation, Message message, String senderId) {
        Set<String> mentionedIds = new LinkedHashSet<>();

        for (String mention : message.getMentions()) {
            if ("all".equals(mention)) {
                // @all → notify every participant except sender
                mentionedIds.addAll(conversation.getParticipantIds());
            } else {
                mentionedIds.add(mention);
            }
        }

        mentionedIds.remove(senderId); // never notify self

        String contentPreview = message.getContent() != null && message.getContent().length() > 100
                ? message.getContent().substring(0, 100) + "..."
                : message.getContent();

        for (String receiverId : mentionedIds) {
            if (conversation.getParticipantIds().contains(receiverId)) {
                notificationService.createAndPush(
                        NotificationType.MENTION,
                        senderId,
                        receiverId,
                        contentPreview,
                        message.getConversationId()
                );
            }
        }
    }

    public MessageResponse sendSystemMessage(String conversationId, String content) {
        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId("SYSTEM")
                .content(content)
                .type(MessageType.SYSTEM)
                .build();

        message = messageRepository.save(message);
        updateLastMessage(conversationId, message);
        broadcastEvent(conversationId, ChatEvent.ChatAction.SEND, messageMapper.toResponse(message));
        return messageMapper.toResponse(message);
    }

    private void updateLastMessage(String conversationId, Message message) {
        String content = message.getContent();
        // For file-based messages with empty content, use the first attachment's filename
        if ((content == null || content.isBlank())
                && message.getAttachments() != null && !message.getAttachments().isEmpty()) {
            String fileName = message.getAttachments().get(0).getName();
            if (fileName != null && !fileName.isBlank()) {
                content = fileName;
            }
        }
        // For LOCATION messages, use address as display content
        if ((content == null || content.isBlank()) && message.getType() == MessageType.LOCATION) {
            content = message.getLocation() != null && message.getLocation().getAddress() != null
                    ? message.getLocation().getAddress()
                    : "[Location]";
        }

        LastMessage lastMessage = LastMessage.builder()
                .senderId(message.getSenderId())
                .content(content)
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
