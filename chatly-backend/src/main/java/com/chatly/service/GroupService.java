package com.chatly.service;

import com.chatly.dto.request.GroupUpdateRequest;
import com.chatly.dto.request.UpdateRoleRequest;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.dto.response.GroupMemberResponse;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final ConversationRepository conversationRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ConversationMapper conversationMapper;

    /**
     * Add a member to a group conversation.
     * Only OWNER or ADMIN can add members.
     */
    @Transactional
    public GroupMemberResponse addMember(String conversationId, String targetUserId, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);
        requireOwnerOrAdmin(conversationId, requesterId);

        UUID targetUid = UUID.fromString(targetUserId);

        if (groupMemberRepository.existsByConversationIdAndUserId(conversationId, targetUid)) {
            throw new AppException(ErrorCode.GROUP_MEMBER_ALREADY_EXISTS);
        }

        User targetUser = userRepository.findById(targetUid)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        GroupMember member = GroupMember.builder()
                .conversationId(conversationId)
                .user(targetUser)
                .role(GroupRole.MEMBER)
                .build();

        groupMemberRepository.save(member);

        // Update participantIds in MongoDB conversation
        conversation.getParticipantIds().add(targetUserId);
        conversationRepository.save(conversation);

        return toMemberResponse(member);
    }

    /**
     * Remove a member from a group conversation.
     * Only OWNER or ADMIN can remove members.
     * ADMIN cannot remove OWNER or other ADMINs.
     */
    @Transactional
    public void removeMember(String conversationId, String targetUserId, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);
        GroupMember requester = requireOwnerOrAdmin(conversationId, requesterId);

        UUID targetUid = UUID.fromString(targetUserId);

        GroupMember target = groupMemberRepository.findByConversationIdAndUserId(conversationId, targetUid)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_MEMBER_NOT_FOUND));

        // ADMIN cannot remove OWNER or other ADMINs
        if (requester.getRole() == GroupRole.ADMIN
                && (target.getRole() == GroupRole.OWNER || target.getRole() == GroupRole.ADMIN)) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        groupMemberRepository.deleteByConversationIdAndUserId(conversationId, targetUid);

        // Update participantIds in MongoDB conversation
        conversation.getParticipantIds().remove(targetUserId);
        conversationRepository.save(conversation);
    }

    /**
     * Change the role of a member.
     * OWNER can assign ADMIN or transfer OWNER.
     * ADMIN cannot assign OWNER.
     */
    @Transactional
    public GroupMemberResponse updateRole(String conversationId, String targetUserId, UpdateRoleRequest request, String requesterId) {
        getGroupConversation(conversationId);
        GroupMember requester = requireOwnerOrAdmin(conversationId, requesterId);

        UUID targetUid = UUID.fromString(targetUserId);
        GroupMember target = groupMemberRepository.findByConversationIdAndUserId(conversationId, targetUid)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_MEMBER_NOT_FOUND));

        GroupRole newRole = request.getRole();

        // ADMIN cannot assign OWNER role
        if (requester.getRole() == GroupRole.ADMIN && newRole == GroupRole.OWNER) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        // When transferring OWNER, the requester must be OWNER and they become ADMIN
        if (newRole == GroupRole.OWNER) {
            if (requester.getRole() != GroupRole.OWNER) {
                throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
            }
            requester.setRole(GroupRole.ADMIN);
            groupMemberRepository.save(requester);
        }

        target.setRole(newRole);
        groupMemberRepository.save(target);

        return toMemberResponse(target);
    }

    /**
     * Update group conversation info (name, avatar).
     */
    @Transactional
    public ConversationResponse updateGroup(String conversationId, GroupUpdateRequest request, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);
        requireOwnerOrAdmin(conversationId, requesterId);

        if (request.getName() != null) {
            conversation.setName(request.getName());
        }
        if (request.getAvatar() != null) {
            conversation.setAvatarUrl(request.getAvatar());
        }

        conversation = conversationRepository.save(conversation);
        return conversationMapper.toResponse(conversation);
    }

    /**
     * Get all members of a group conversation.
     */
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getMembers(String conversationId, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);

        // Verify requester is a participant via MongoDB participantIds (source of truth)
        if (!conversation.getParticipantIds().contains(requesterId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        return groupMemberRepository.findByConversationId(conversationId)
                .stream()
                .map(this::toMemberResponse)
                .toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private Conversation getGroupConversation(String conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (conversation.getType() != ConversationType.GROUP) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        return conversation;
    }

    private GroupMember requireOwnerOrAdmin(String conversationId, String userId) {
        UUID uid = UUID.fromString(userId);
        GroupMember member = groupMemberRepository.findByConversationIdAndUserId(conversationId, uid)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_MEMBER_NOT_FOUND));

        if (member.getRole() != GroupRole.OWNER && member.getRole() != GroupRole.ADMIN) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        return member;
    }

    private GroupMemberResponse toMemberResponse(GroupMember member) {
        User user = member.getUser();
        return GroupMemberResponse.builder()
                .userId(user.getId().toString())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatar(user.getAvatarUrl())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
