package com.chatly.service;

import com.chatly.dto.request.ConversationRequest;
import com.chatly.dto.request.MuteConversationRequest;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.dto.response.PagedResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ConversationMapper;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.GroupRole;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.mongo.Conversation;
import com.chatly.model.mongo.LastMessage;
import com.chatly.model.mongo.Message;
import com.chatly.model.mongo.Notification;
import com.chatly.model.postgres.GroupMember;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.NotificationRepository;
import com.chatly.repository.postgres.GroupMemberRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.websocket.ChatEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private static final String FIELD_CONVERSATION_ID = "conversationId";
    private static final String FIELD_CREATED_AT = "createdAt";
    private static final String FIELD_DELETED_BY = "deletedBy";

    private final ConversationRepository conversationRepository;
    private final NotificationRepository notificationRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ConversationMapper conversationMapper;
    private final MongoTemplate mongoTemplate;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ConversationResponse create(String creatorId, ConversationRequest request) {
        List<String> participantIds = new ArrayList<>(request.getParticipantIds());
        participantIds.removeIf(id -> id == null || id.isBlank());

        if (!participantIds.contains(creatorId)) {
            participantIds.add(creatorId);
        }

        if (request.getType() == ConversationType.PRIVATE && participantIds.size() != 2) {
            throw new AppException(ErrorCode.CONVERSATION_INVALID_PARTICIPANTS);
        }

        Conversation conversation = Conversation.builder()
                .type(request.getType())
                .name(request.getName())
                .creatorId(creatorId)
                .participantIds(participantIds)
                .build();

        conversation = conversationRepository.save(conversation);

        if (request.getType() == ConversationType.GROUP) {
            createGroupMembers(conversation.getId(), creatorId, participantIds);
            notifyCreatedGroupParticipants(conversation, creatorId);
        }

        return conversationMapper.toResponse(conversation);
    }

    public ConversationResponse getById(String id, String userId) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        ConversationResponse response = conversationMapper.toResponse(conversation);
        response.setUnreadCount(getConversationUnreadCount(id, userId));
        applyVisibleLastMessage(response, id, userId);
        enrichPinMuteFlags(response, conversation, userId);
        return response;
    }

    public List<ConversationResponse> getByUserId(String userId) {
        List<ConversationResponse> responses = conversationRepository
                .findByParticipantIdsContainingOrderByUpdatedAtDesc(userId)
                .stream()
                .filter(c -> c.getDeletedBy() == null || !c.getDeletedBy().contains(userId))
                .map(c -> {
                    ConversationResponse res = conversationMapper.toResponse(c);
                    res.setUnreadCount(getConversationUnreadCount(c.getId(), userId));
                    applyVisibleLastMessage(res, c.getId(), userId);
                    enrichPinMuteFlags(res, c, userId);
                    return res;
                })
                .toList();

        // Sort: pinned first, then by updatedAt (already sorted)
        return responses.stream()
                .sorted((a, b) -> Boolean.compare(b.isPinned(), a.isPinned()))
                .toList();
    }

    public PagedResponse<ConversationResponse> search(String userId, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Query query = new Query();

        Criteria notDeleted = Criteria.where("deletedBy").nin(userId);

        if (keyword != null && !keyword.isBlank()) {
            Pattern safePattern = Pattern.compile(Pattern.quote(keyword.trim()), Pattern.CASE_INSENSITIVE);

            List<String> matchedParticipantIds = userRepository.searchIdsByKeyword(keyword.trim())
                    .stream()
                    .map(UUID::toString)
                    .toList();

            List<Criteria> searchableCriteria = new ArrayList<>();
            searchableCriteria.add(Criteria.where("name").regex(safePattern));

            if (!matchedParticipantIds.isEmpty()) {
                searchableCriteria.add(Criteria.where("participantIds").in(matchedParticipantIds));
            }

            query.addCriteria(new Criteria().andOperator(
                    Criteria.where("participantIds").in(userId),
                    notDeleted,
                    new Criteria().orOperator(searchableCriteria.toArray(new Criteria[0]))
            ));
        } else {
            query.addCriteria(new Criteria().andOperator(
                    Criteria.where("participantIds").in(userId),
                    notDeleted
            ));
        }

        long total = mongoTemplate.count(query, Conversation.class);

        query.with(Sort.by(Sort.Direction.DESC, "updatedAt"));
        query.with(pageable);

        List<ConversationResponse> items = mongoTemplate.find(query, Conversation.class)
                .stream()
                .map(c -> {
                    ConversationResponse res = conversationMapper.toResponse(c);
                    res.setUnreadCount(getConversationUnreadCount(c.getId(), userId));
                    applyVisibleLastMessage(res, c.getId(), userId);
                    return res;
                })
                .toList();

        return PagedResponse.from(new PageImpl<>(items, pageable, total));
    }

    /**
     * Per-user soft delete: hides the conversation from the user's chat list.
     * The conversation reappears when a new message arrives.
     */
    public void delete(String id, String userId) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        Set<String> deletedBy = conversation.getDeletedBy();
        if (deletedBy == null) {
            deletedBy = new HashSet<>();
            conversation.setDeletedBy(deletedBy);
        }
        deletedBy.add(userId);
        conversationRepository.save(conversation);
    }

    /**
     * Hard-delete a GROUP conversation: removes all members, messages, notifications,
     * and the conversation itself. Only the group OWNER may call this.
     */
    @Transactional
    public void dissolve(String id, String userId) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        if (conversation.getType() != ConversationType.GROUP) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        GroupMember member = groupMemberRepository.findByConversationIdAndUserId(id, UUID.fromString(userId))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT));

        if (member.getRole() != GroupRole.OWNER) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        broadcastGroupDissolved(id);

        // Delete all group memberships in Postgres
        List<GroupMember> members = groupMemberRepository.findByConversationId(id);
        groupMemberRepository.deleteAllInBatch(members);

        // Delete all associated data in MongoDB
        mongoTemplate.remove(Query.query(Criteria.where("conversationId").is(id)), Message.class);
        mongoTemplate.remove(Query.query(Criteria.where("referenceId").is(id)), Notification.class);

        // Delete the conversation itself
        conversationRepository.delete(conversation);
    }

    private void broadcastGroupDissolved(String conversationId) {
        messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId,
                ChatEvent.builder()
                        .action(ChatEvent.ChatAction.GROUP_DISSOLVED)
                        .build()
        );
    }

    private long getConversationUnreadCount(String conversationId, String userId) {
        return notificationRepository.countByReceiverIdAndTypeAndReferenceIdAndReadFalse(
                userId, NotificationType.NEW_MESSAGE, conversationId);
    }

    private void createGroupMembers(String conversationId, String creatorId, List<String> participantIds) {
        for (String participantId : participantIds) {
            UUID uid = UUID.fromString(participantId);
            User user = userRepository.findById(uid)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            GroupRole role = participantId.equals(creatorId) ? GroupRole.OWNER : GroupRole.MEMBER;

            GroupMember member = GroupMember.builder()
                    .conversationId(conversationId)
                    .user(user)
                    .role(role)
                    .build();

            groupMemberRepository.save(member);
        }
    }

    private void notifyCreatedGroupParticipants(Conversation conversation, String creatorId) {
        User creator = userRepository.findById(UUID.fromString(creatorId)).orElse(null);
        String creatorName = creator != null ? creator.getDisplayName() : "Someone";
        String groupName = conversation.getName() != null && !conversation.getName().isBlank()
                ? conversation.getName()
                : "a group chat";
        String content = creatorName + " added you to " + groupName;

        conversation.getParticipantIds().stream()
                .filter(participantId -> !participantId.equals(creatorId))
                .forEach(participantId -> notificationService.createAndPush(
                        NotificationType.GROUP_INVITE,
                        creatorId,
                        participantId,
                        content,
                        conversation.getId()
                ));
    }

    // ==================== Pin / Unpin ====================

    private static final int MAX_PINNED = 5;

    public void pinConversation(String conversationId, String userId) {
        Conversation conversation = getConversationForParticipant(conversationId, userId);

        if (conversation.getPinnedBy() != null && conversation.getPinnedBy().contains(userId)) {
            throw new AppException(ErrorCode.CONVERSATION_ALREADY_PINNED);
        }

        // Check pin limit
        long pinnedCount = conversationRepository
                .findByParticipantIdsContaining(userId)
                .stream()
                .filter(c -> c.getPinnedBy() != null && c.getPinnedBy().contains(userId))
                .count();

        if (pinnedCount >= MAX_PINNED) {
            throw new AppException(ErrorCode.CONVERSATION_PIN_LIMIT);
        }

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(conversationId)),
                new Update().addToSet("pinnedBy", userId),
                Conversation.class
        );
    }

    public void unpinConversation(String conversationId, String userId) {
        Conversation conversation = getConversationForParticipant(conversationId, userId);

        if (conversation.getPinnedBy() == null || !conversation.getPinnedBy().contains(userId)) {
            throw new AppException(ErrorCode.CONVERSATION_NOT_PINNED);
        }

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(conversationId)),
                new Update().pull("pinnedBy", userId),
                Conversation.class
        );
    }

    // ==================== Mute / Unmute ====================

    public void muteConversation(String conversationId, String userId, MuteConversationRequest request) {
        Conversation conversation = getConversationForParticipant(conversationId, userId);

        Map<String, Instant> mutedBy = conversation.getMutedBy();
        if (mutedBy != null && mutedBy.containsKey(userId)) {
            Instant until = mutedBy.get(userId);
            if (until == null || until.isAfter(Instant.now())) {
                throw new AppException(ErrorCode.CONVERSATION_ALREADY_MUTED);
            }
        }

        Instant muteUntil = (request != null) ? request.getMuteUntil() : null;

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(conversationId)),
                new Update().set("mutedBy." + userId, muteUntil),
                Conversation.class
        );
    }

    public void unmuteConversation(String conversationId, String userId) {
        Conversation conversation = getConversationForParticipant(conversationId, userId);

        if (conversation.getMutedBy() == null || !conversation.getMutedBy().containsKey(userId)) {
            throw new AppException(ErrorCode.CONVERSATION_NOT_MUTED);
        }

        mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(conversationId)),
                new Update().unset("mutedBy." + userId),
                Conversation.class
        );
    }

    // ==================== Helpers ====================

    private Conversation getConversationForParticipant(String conversationId, String userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        return conversation;
    }

    private void enrichPinMuteFlags(ConversationResponse response, Conversation conversation, String userId) {
        response.setPinned(conversation.getPinnedBy() != null && conversation.getPinnedBy().contains(userId));

        boolean muted = false;
        if (conversation.getMutedBy() != null && conversation.getMutedBy().containsKey(userId)) {
            Instant until = conversation.getMutedBy().get(userId);
            muted = (until == null || until.isAfter(Instant.now()));
        }
        response.setMuted(muted);
    }

    private void applyVisibleLastMessage(ConversationResponse response, String conversationId, String userId) {
        Query query = Query.query(new Criteria().andOperator(
                Criteria.where(FIELD_CONVERSATION_ID).is(conversationId),
                Criteria.where(FIELD_DELETED_BY).nin(userId)
        ));
        query.with(Sort.by(Sort.Direction.DESC, FIELD_CREATED_AT));
        query.limit(1);

        Message message = mongoTemplate.findOne(query, Message.class);
        if (message == null) {
            response.setLastMessage(null);
            return;
        }

        response.setLastMessage(LastMessage.builder()
                .senderId(message.getSenderId())
                .content(message.getContent())
                .type(message.getType())
                .timestamp(message.getCreatedAt())
                .build());
    }
}
