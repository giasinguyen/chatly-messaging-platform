package com.chatly.service;

import com.chatly.dto.request.ConversationRequest;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.dto.response.PagedResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ConversationMapper;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.GroupRole;
import com.chatly.model.mongo.Conversation;
import com.chatly.model.postgres.GroupMember;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.postgres.GroupMemberRepository;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ConversationMapper conversationMapper;
    private final MongoTemplate mongoTemplate;

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
        }

        return conversationMapper.toResponse(conversation);
    }

    public ConversationResponse getById(String id, String userId) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        return conversationMapper.toResponse(conversation);
    }

    public List<ConversationResponse> getByUserId(String userId) {
        return conversationRepository.findByParticipantIdsContainingOrderByUpdatedAtDesc(userId)
                .stream()
                .map(conversationMapper::toResponse)
                .toList();
    }

    public PagedResponse<ConversationResponse> search(String userId, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Query query = new Query();

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
                    new Criteria().orOperator(searchableCriteria.toArray(new Criteria[0]))
            ));
        } else {
            query.addCriteria(Criteria.where("participantIds").in(userId));
        }

        long total = mongoTemplate.count(query, Conversation.class);

        query.with(Sort.by(Sort.Direction.DESC, "updatedAt"));
        query.with(pageable);

        List<ConversationResponse> items = mongoTemplate.find(query, Conversation.class)
                .stream()
                .map(conversationMapper::toResponse)
                .toList();

        return PagedResponse.from(new PageImpl<>(items, pageable, total));
    }

    @Transactional
    public void delete(String id, String userId) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getCreatorId().equals(userId)) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        conversationRepository.deleteById(id);
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
}
