package com.chatly.service;

import com.chatly.dto.request.GroupNoteRequest;
import com.chatly.dto.request.GroupReminderRequest;
import com.chatly.dto.request.GroupUpdateRequest;
import com.chatly.dto.request.UpdateRoleRequest;
import com.chatly.dto.response.*;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ConversationMapper;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.GroupRole;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.mongo.*;
import com.chatly.model.postgres.GroupMember;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.*;
import com.chatly.repository.postgres.GroupMemberRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.websocket.ChatEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private final ConversationRepository conversationRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ConversationMapper conversationMapper;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final PendingJoinRequestRepository pendingJoinRequestRepository;
    private final GroupReminderRepository groupReminderRepository;
    private final GroupNoteRepository groupNoteRepository;
    private final MessageService messageService;

    /**
     * Add a member to a group conversation.
     * Only OWNER or ADMIN can add members.
     */
    @Transactional
    public GroupMemberResponse addMember(String conversationId, String targetUserId, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);
        GroupMember requester = requireOwnerOrAdmin(conversationId, requesterId);

        UUID targetUid = UUID.fromString(targetUserId);

        if (groupMemberRepository.existsByConversationIdAndUserId(conversationId, targetUid)) {
            throw new AppException(ErrorCode.GROUP_MEMBER_ALREADY_EXISTS);
        }

        // Check if requireApproval is enabled and requester is not OWNER
        if (Boolean.TRUE.equals(conversation.getRequireApproval()) && requester.getRole() != GroupRole.OWNER) {
            // Create pending request instead
            if (pendingJoinRequestRepository.existsByConversationIdAndUserId(conversationId, targetUserId)) {
                throw new AppException(ErrorCode.GROUP_PENDING_REQUEST_EXISTS);
            }
            pendingJoinRequestRepository.save(PendingJoinRequest.builder()
                    .conversationId(conversationId)
                    .userId(targetUserId)
                    .invitedBy(requesterId)
                    .build());
            // Return a special response with userId so frontend knows it's pending
            User targetUser = userRepository.findById(targetUid)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            // Notify admins/owners about the new join request
            notifyAdminsOfJoinRequest(conversation, targetUser);

            return GroupMemberResponse.builder()
                    .userId(targetUser.getId().toString())
                    .username(targetUser.getUsername())
                    .displayName(targetUser.getDisplayName())
                    .avatar(targetUser.getAvatarUrl())
                    .role(null) // null role signals pending
                    .build();
        }

        return doAddMember(conversation, targetUserId, requesterId);
    }

    private GroupMemberResponse doAddMember(Conversation conversation, String targetUserId, String requesterId) {
        UUID targetUid = UUID.fromString(targetUserId);

        User targetUser = userRepository.findById(targetUid)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        GroupMember member = GroupMember.builder()
                .conversationId(conversation.getId())
                .user(targetUser)
                .role(GroupRole.MEMBER)
                .build();

        groupMemberRepository.save(member);

        conversation.getParticipantIds().add(targetUserId);
        conversationRepository.save(conversation);

        notificationService.createAndPush(
                NotificationType.GROUP_INVITE,
                requesterId,
                targetUserId,
                "You have been added to group " + (conversation.getName() != null ? conversation.getName() : "chat"),
                conversation.getId()
        );

        // Send system message about new member
        try {
            User requesterUser = requesterId.equals(targetUserId) ? targetUser
                    : userRepository.findById(UUID.fromString(requesterId)).orElse(null);
            String requesterName = requesterUser != null ? requesterUser.getDisplayName() : "Someone";
            String content = requesterId.equals(targetUserId)
                    ? targetUser.getDisplayName() + " joined the group"
                    : requesterName + " added " + targetUser.getDisplayName() + " to the group";
            messageService.sendSystemMessage(conversation.getId(), content);
        } catch (Exception e) {
            // Don't fail if system message fails
        }

        broadcastGroupUpdate(conversation.getId(), conversationMapper.toResponse(conversation));

        return toMemberResponse(member);
    }

    /**
     * Remove a member from a group conversation.
     * A member can always remove themselves (leave).
     * Only OWNER or ADMIN can remove other members.
     * ADMIN cannot remove OWNER or other ADMINs.
     * When OWNER leaves, ownership is transferred to an ADMIN (or first MEMBER if no ADMINs).
     */
    @Transactional
    public void removeMember(String conversationId, String targetUserId, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);

        UUID targetUid = UUID.fromString(targetUserId);
        boolean isSelfLeave = targetUserId.equals(requesterId);

        GroupMember target = groupMemberRepository.findByConversationIdAndUserId(conversationId, targetUid)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_MEMBER_NOT_FOUND));

        if (isSelfLeave) {
            // Any member can leave on their own
            // If OWNER is leaving, transfer ownership first
            if (target.getRole() == GroupRole.OWNER) {
                transferOwnershipBeforeLeave(conversationId, targetUserId);
            }
        } else {
            // Kicking another member requires OWNER or ADMIN
            GroupMember requester = requireOwnerOrAdmin(conversationId, requesterId);
            // ADMIN cannot remove OWNER or other ADMINs
            if (requester.getRole() == GroupRole.ADMIN
                    && (target.getRole() == GroupRole.OWNER || target.getRole() == GroupRole.ADMIN)) {
                throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
            }
        }

        groupMemberRepository.deleteByConversationIdAndUserId(conversationId, targetUid);

        // Update participantIds in MongoDB conversation
        conversation.getParticipantIds().remove(targetUserId);
        conversationRepository.save(conversation);

        // Send system message
        try {
            User targetUser = userRepository.findById(targetUid).orElse(null);
            String targetName = targetUser != null ? targetUser.getDisplayName() : "A member";
            String content;
            if (isSelfLeave) {
                content = targetName + " left the group";
            } else {
                User requesterUser = userRepository.findById(UUID.fromString(requesterId)).orElse(null);
                String requesterName = requesterUser != null ? requesterUser.getDisplayName() : "Someone";
                content = requesterName + " removed " + targetName + " from the group";
            }
            messageService.sendSystemMessage(conversationId, content);
        } catch (Exception e) {
            // Don't fail if system message fails
        }

        notificationService.createAndPush(
                NotificationType.GROUP_LEAVE,
                isSelfLeave ? null : requesterId,
                targetUserId,
                isSelfLeave ? "You left the group" : "You were removed from the group",
                conversationId
        );

        broadcastGroupUpdate(conversation.getId(), conversationMapper.toResponse(conversation));
    }

    /**
     * Transfer OWNER role to the best candidate before the current owner leaves.
     * Priority: first ADMIN (by join order), then first MEMBER.
     */
    private void transferOwnershipBeforeLeave(String conversationId, String ownerUserId) {
        UUID ownerUid = UUID.fromString(ownerUserId);

        // Find an ADMIN to promote (ordered by joinedAt for deterministic selection)
        List<GroupMember> admins = groupMemberRepository.findByConversationIdAndRoleInOrderByJoinedAtAsc(
                conversationId, List.of(GroupRole.ADMIN));
        admins = admins.stream().filter(m -> !m.getUser().getId().equals(ownerUid)).toList();

        GroupMember newOwner;
        if (!admins.isEmpty()) {
            newOwner = admins.getFirst();
        } else {
            // No admins — promote earliest-joined regular member
            List<GroupMember> allMembers = groupMemberRepository.findByConversationIdOrderByJoinedAtAsc(conversationId);
            List<GroupMember> candidates = allMembers.stream()
                    .filter(m -> !m.getUser().getId().equals(ownerUid))
                    .toList();
            if (candidates.isEmpty()) {
                return; // Last member leaving — no one to transfer to
            }
            newOwner = candidates.getFirst();
        }

        newOwner.setRole(GroupRole.OWNER);
        groupMemberRepository.save(newOwner);

        // Broadcast role change to all participants
        broadcastRoleUpdate(conversationId, newOwner);

        // Send system message about ownership transfer
        try {
            User newOwnerUser = newOwner.getUser();
            String content = newOwnerUser.getDisplayName() + " is now the group owner";
            messageService.sendSystemMessage(conversationId, content);
        } catch (Exception e) {
            // Don't fail if system message fails
        }
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

        // Cannot change own role
        if (requesterId.equals(targetUserId)) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        // ADMIN cannot assign OWNER role
        if (requester.getRole() == GroupRole.ADMIN && newRole == GroupRole.OWNER) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        // ADMIN cannot change another ADMIN's role — only OWNER can
        if (requester.getRole() == GroupRole.ADMIN && target.getRole() == GroupRole.ADMIN) {
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

        // Broadcast role change to all participants
        broadcastRoleUpdate(conversationId, target);

        return toMemberResponse(target);
    }

    /**
     * Update group conversation info (name, avatar, permissions).
     */
    @Transactional
    public ConversationResponse updateGroup(String conversationId, GroupUpdateRequest request, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);
        String previousAvatarUrl = conversation.getAvatarUrl();
        
        // Check permission: only owner/admin can always update; members can update only if allowMembersUpdateInfo is true
        // Treat null as true (field didn't exist for older groups; default is "allowed")
        GroupMember requester = requireGroupMember(conversationId, requesterId);
        boolean isOwnerOrAdmin = requester.getRole() == GroupRole.OWNER || requester.getRole() == GroupRole.ADMIN;
        boolean canUpdate = isOwnerOrAdmin || !Boolean.FALSE.equals(conversation.getAllowMembersUpdateInfo());
        
        if (!canUpdate) {
            throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
        }

        if (request.getName() != null) {
            conversation.setName(request.getName());
        }
        if (request.getAvatar() != null) {
            conversation.setAvatarUrl(request.getAvatar());
        }
        if (request.getAllowMembersUpdateInfo() != null && isOwnerOrAdmin) {
            // Only owner/admin can change this setting
            conversation.setAllowMembersUpdateInfo(request.getAllowMembersUpdateInfo());
        }
        if (request.getRequireApproval() != null && isOwnerOrAdmin) {
            conversation.setRequireApproval(request.getRequireApproval());
        }
        if (request.getAiProactiveEnabled() != null && isOwnerOrAdmin) {
            conversation.setAiProactiveEnabled(request.getAiProactiveEnabled());
        }

        conversation = conversationRepository.save(conversation);
        ConversationResponse response = conversationMapper.toResponse(conversation);

        if (request.getAvatar() != null && !Objects.equals(previousAvatarUrl, request.getAvatar())) {
            notifyGroupAvatarUpdated(conversation, requesterId);
        }
        
        // Broadcast GROUP_UPDATE event to all participants
        broadcastGroupUpdate(conversationId, response);
        
        return response;
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

    // ── Invite Link ───────────────────────────────────────────────────

    public InviteLinkResponse getOrCreateInviteLink(String conversationId, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);
        requireGroupMember(conversationId, requesterId);

        if (conversation.getInviteToken() == null || conversation.getInviteToken().isBlank()) {
            conversation.setInviteToken(UUID.randomUUID().toString().replace("-", ""));
            conversationRepository.save(conversation);
        }

        return InviteLinkResponse.builder()
                .inviteToken(conversation.getInviteToken())
                .inviteLink("/join/" + conversation.getInviteToken())
                .build();
    }

    public InviteLinkResponse resetInviteLink(String conversationId, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);
        requireOwnerOrAdmin(conversationId, requesterId);

        conversation.setInviteToken(UUID.randomUUID().toString().replace("-", ""));
        conversationRepository.save(conversation);

        return InviteLinkResponse.builder()
                .inviteToken(conversation.getInviteToken())
                .inviteLink("/join/" + conversation.getInviteToken())
                .build();
    }

    public InviteLinkInfoResponse getInviteLinkInfo(String inviteToken, String userId) {
        Conversation conversation = conversationRepository.findAll().stream()
                .filter(c -> inviteToken.equals(c.getInviteToken()) && c.getType() == ConversationType.GROUP)
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_INVITE_TOKEN_INVALID));

        UUID uid = UUID.fromString(userId);
        boolean isAlreadyMember = groupMemberRepository.existsByConversationIdAndUserId(conversation.getId(), uid);
        boolean hasPendingRequest = pendingJoinRequestRepository.existsByConversationIdAndUserId(conversation.getId(), userId);
        int memberCount = conversation.getParticipantIds() != null ? conversation.getParticipantIds().size() : 0;

        return InviteLinkInfoResponse.builder()
                .conversationId(conversation.getId())
                .name(conversation.getName())
                .avatarUrl(conversation.getAvatarUrl())
                .memberCount(memberCount)
                .requireApproval(Boolean.TRUE.equals(conversation.getRequireApproval()))
                .isAlreadyMember(isAlreadyMember)
                .hasPendingRequest(hasPendingRequest)
                .build();
    }

    @Transactional
    public GroupMemberResponse joinByInviteLink(String inviteToken, String userId) {
        Conversation conversation = conversationRepository.findAll().stream()
                .filter(c -> inviteToken.equals(c.getInviteToken()) && c.getType() == ConversationType.GROUP)
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_INVITE_TOKEN_INVALID));

        UUID uid = UUID.fromString(userId);
        if (groupMemberRepository.existsByConversationIdAndUserId(conversation.getId(), uid)) {
            // Already a member — return existing member info instead of error
            User existingUser = userRepository.findById(uid)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            GroupMember existingMember = groupMemberRepository.findByConversationIdAndUserId(conversation.getId(), uid)
                    .orElseThrow(() -> new AppException(ErrorCode.GROUP_MEMBER_NOT_FOUND));
            return GroupMemberResponse.builder()
                    .conversationId(conversation.getId())
                    .userId(existingUser.getId().toString())
                    .username(existingUser.getUsername())
                    .displayName(existingUser.getDisplayName())
                    .avatar(existingUser.getAvatarUrl())
                    .role(existingMember.getRole())
                    .joinedAt(existingMember.getJoinedAt())
                    .build();
        }

        // If requireApproval is on, create pending request
        if (Boolean.TRUE.equals(conversation.getRequireApproval())) {
            if (pendingJoinRequestRepository.existsByConversationIdAndUserId(conversation.getId(), userId)) {
                // Already has a pending request — return pending info instead of error
                User u = userRepository.findById(uid).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                return GroupMemberResponse.builder()
                        .conversationId(conversation.getId())
                        .userId(u.getId().toString()).username(u.getUsername())
                        .displayName(u.getDisplayName()).avatar(u.getAvatarUrl())
                        .role(null) // null = pending
                        .build();
            }
            pendingJoinRequestRepository.save(PendingJoinRequest.builder()
                    .conversationId(conversation.getId())
                    .userId(userId)
                    .invitedBy(null)
                    .build());
            User u = userRepository.findById(uid).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            // Notify admins/owners about the new join request
            notifyAdminsOfJoinRequest(conversation, u);

            return GroupMemberResponse.builder()
                    .userId(u.getId().toString()).username(u.getUsername())
                    .displayName(u.getDisplayName()).avatar(u.getAvatarUrl())
                    .role(null) // null = pending
                    .build();
        }

        return doAddMember(conversation, userId, userId);
    }

    // ── Pending Join Requests ────────────────────────────────────────

    public List<PendingJoinResponse> getPendingRequests(String conversationId, String requesterId) {
        getGroupConversation(conversationId);
        requireOwnerOrAdmin(conversationId, requesterId);

        return pendingJoinRequestRepository.findByConversationId(conversationId).stream()
                .map(req -> {
                    User u = userRepository.findById(UUID.fromString(req.getUserId())).orElse(null);
                    return PendingJoinResponse.builder()
                            .id(req.getId())
                            .conversationId(req.getConversationId())
                            .userId(req.getUserId())
                            .displayName(u != null ? u.getDisplayName() : "Unknown")
                            .username(u != null ? u.getUsername() : "unknown")
                            .avatarUrl(u != null ? u.getAvatarUrl() : null)
                            .invitedBy(req.getInvitedBy())
                            .createdAt(req.getCreatedAt())
                            .build();
                })
                .toList();
    }

    @Transactional
    public GroupMemberResponse approvePendingRequest(String conversationId, String targetUserId, String requesterId) {
        Conversation conversation = getGroupConversation(conversationId);
        // Only OWNER or ADMIN can approve
        GroupMember requester = requireOwnerOrAdmin(conversationId, requesterId);

        PendingJoinRequest pending = pendingJoinRequestRepository.findFirstByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_PENDING_REQUEST_NOT_FOUND));

        pendingJoinRequestRepository.deleteByConversationIdAndUserId(conversationId, targetUserId);
        GroupMemberResponse result = doAddMember(conversation, targetUserId, requesterId);

        // Broadcast MEMBER_JOINED to all existing group members
        notifyMembersOfJoin(conversation, targetUserId);

        return result;
    }

    @Transactional
    public void rejectPendingRequest(String conversationId, String targetUserId, String requesterId) {
        getGroupConversation(conversationId);
        requireOwnerOrAdmin(conversationId, requesterId);
        PendingJoinRequest pending = pendingJoinRequestRepository.findFirstByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_PENDING_REQUEST_NOT_FOUND));
        pendingJoinRequestRepository.deleteByConversationIdAndUserId(conversationId, targetUserId);
    }

    /**
     * Notify all OWNER and ADMIN members about a new join request.
     */
    private void notifyAdminsOfJoinRequest(Conversation conversation, User requester) {
        String groupName = conversation.getName() != null ? conversation.getName() : "group";
        String content = requester.getDisplayName() + " requested to join " + groupName;

        List<GroupMember> admins = groupMemberRepository.findByConversationIdAndRoleIn(
                conversation.getId(), List.of(GroupRole.OWNER, GroupRole.ADMIN));

        for (GroupMember admin : admins) {
            notificationService.createAndPush(
                    NotificationType.GROUP_JOIN_REQUEST,
                    requester.getId().toString(),
                    admin.getUser().getId().toString(),
                    content,
                    conversation.getId()
            );
        }
    }

    /**
     * Notify all existing group members that a new member has joined.
     */
    private void notifyMembersOfJoin(Conversation conversation, String newMemberId) {
        User newUser = userRepository.findById(UUID.fromString(newMemberId)).orElse(null);
        if (newUser == null) return;

        String groupName = conversation.getName() != null ? conversation.getName() : "group";
        String content = newUser.getDisplayName() + " joined " + groupName;

        List<GroupMember> members = groupMemberRepository.findByConversationId(conversation.getId());
        for (GroupMember member : members) {
            String memberId = member.getUser().getId().toString();
            if (memberId.equals(newMemberId)) continue;
            notificationService.createAndPush(
                    NotificationType.MEMBER_JOINED,
                    newMemberId,
                    memberId,
                    content,
                    conversation.getId()
            );
        }
    }

    // ── Reminders ────────────────────────────────────────────────────

    public List<GroupReminderResponse> getReminders(String conversationId, String requesterId) {
        requireAnyConversationParticipant(conversationId, requesterId);

        return groupReminderRepository.findByConversationIdOrderByRemindAtAsc(conversationId).stream()
                .map(this::toReminderResponse)
                .toList();
    }

    public GroupReminderResponse createReminder(String conversationId, GroupReminderRequest request, String requesterId) {
        requireAnyConversationParticipant(conversationId, requesterId);

        GroupReminder reminder = GroupReminder.builder()
                .conversationId(conversationId)
                .creatorId(requesterId)
                .title(request.getTitle())
                .description(request.getDescription())
                .remindAt(request.getRemindAt())
                .build();

        GroupReminder saved = groupReminderRepository.save(reminder);

        // Broadcast SYSTEM message to group chat
        try {
            User creator = userRepository.findById(UUID.fromString(requesterId)).orElse(null);
            String creatorName = creator != null ? creator.getDisplayName() : "Member";
            String timeInfo = request.getRemindAt() != null
                    ? " — Scheduled: " + java.time.format.DateTimeFormatter
                        .ofPattern("HH:mm dd/MM/yyyy")
                        .withZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                        .format(request.getRemindAt())
                    : "";
            String content = "📋 " + creatorName + " created a reminder: " + request.getTitle() + timeInfo;
            messageService.sendSystemMessage(conversationId, content);
        } catch (Exception e) {
            // Don't fail the create if broadcast fails
        }

        return toReminderResponse(saved);
    }

    public GroupReminderResponse toggleReminderComplete(String reminderId, String requesterId) {
        GroupReminder reminder = groupReminderRepository.findById(reminderId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_REMINDER_NOT_FOUND));
        requireAnyConversationParticipant(reminder.getConversationId(), requesterId);

        reminder.setCompleted(!Boolean.TRUE.equals(reminder.getCompleted()));
        return toReminderResponse(groupReminderRepository.save(reminder));
    }

    public void deleteReminder(String reminderId, String requesterId) {
        GroupReminder reminder = groupReminderRepository.findById(reminderId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_REMINDER_NOT_FOUND));
        requireAnyConversationParticipant(reminder.getConversationId(), requesterId);
        groupReminderRepository.delete(reminder);
    }

    public GroupReminderResponse updateReminder(String reminderId, GroupReminderRequest request, String requesterId) {
        GroupReminder reminder = groupReminderRepository.findById(reminderId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_REMINDER_NOT_FOUND));
        requireAnyConversationParticipant(reminder.getConversationId(), requesterId);

        if (request.getTitle() != null) reminder.setTitle(request.getTitle());
        if (request.getDescription() != null) reminder.setDescription(request.getDescription());
        if (request.getRemindAt() != null) {
            reminder.setRemindAt(request.getRemindAt());
            reminder.setNotified(false); // reset notification if time changed
        }

        return toReminderResponse(groupReminderRepository.save(reminder));
    }

    // ── Notes ────────────────────────────────────────────────────────

    public List<GroupNoteResponse> getNotes(String conversationId, String requesterId) {
        requireAnyConversationParticipant(conversationId, requesterId);

        return groupNoteRepository.findByConversationIdOrderByPinnedDescCreatedAtDesc(conversationId).stream()
                .map(this::toNoteResponse)
                .toList();
    }

    public GroupNoteResponse createNote(String conversationId, GroupNoteRequest request, String requesterId) {
        requireAnyConversationParticipant(conversationId, requesterId);

        GroupNote note = GroupNote.builder()
                .conversationId(conversationId)
                .creatorId(requesterId)
                .title(request.getTitle())
                .content(request.getContent())
                .pinned(request.getPinned() != null && request.getPinned())
                .build();

        return toNoteResponse(groupNoteRepository.save(note));
    }

    public GroupNoteResponse updateNote(String noteId, GroupNoteRequest request, String requesterId) {
        GroupNote note = groupNoteRepository.findById(noteId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOTE_NOT_FOUND));
        requireAnyConversationParticipant(note.getConversationId(), requesterId);

        if (request.getTitle() != null) note.setTitle(request.getTitle());
        if (request.getContent() != null) note.setContent(request.getContent());
        if (request.getPinned() != null) note.setPinned(request.getPinned());

        return toNoteResponse(groupNoteRepository.save(note));
    }

    public void deleteNote(String noteId, String requesterId) {
        GroupNote note = groupNoteRepository.findById(noteId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOTE_NOT_FOUND));
        requireAnyConversationParticipant(note.getConversationId(), requesterId);
        groupNoteRepository.delete(note);
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

    private GroupMember requireGroupMember(String conversationId, String userId) {
        UUID uid = UUID.fromString(userId);
        return groupMemberRepository.findByConversationIdAndUserId(conversationId, uid)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_MEMBER_NOT_FOUND));
    }

    private void requireAnyConversationParticipant(String conversationId, String userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));
        if (conversation.getType() == ConversationType.GROUP) {
            requireGroupMember(conversationId, userId);
        } else {
            if (!conversation.getParticipantIds().contains(userId)) {
                throw new AppException(ErrorCode.GROUP_PERMISSION_DENIED);
            }
        }
    }

    private GroupMemberResponse toMemberResponse(GroupMember member) {
        User user = member.getUser();
        return GroupMemberResponse.builder()
                .conversationId(member.getConversationId())
                .userId(user.getId().toString())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatar(user.getAvatarUrl())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }

    private GroupReminderResponse toReminderResponse(GroupReminder r) {
        return GroupReminderResponse.builder()
                .id(r.getId()).conversationId(r.getConversationId())
                .creatorId(r.getCreatorId()).title(r.getTitle())
                .description(r.getDescription()).remindAt(r.getRemindAt())
                .completed(r.getCompleted()).createdAt(r.getCreatedAt())
                .build();
    }

    private GroupNoteResponse toNoteResponse(GroupNote n) {
        return GroupNoteResponse.builder()
                .id(n.getId()).conversationId(n.getConversationId())
                .creatorId(n.getCreatorId()).title(n.getTitle())
                .content(n.getContent()).pinned(n.getPinned())
                .createdAt(n.getCreatedAt()).updatedAt(n.getUpdatedAt())
                .build();
    }

    private void broadcastGroupUpdate(String conversationId, ConversationResponse updatedConversation) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/conversation." + conversationId,
                    ChatEvent.builder()
                            .action(ChatEvent.ChatAction.GROUP_UPDATE)
                            .conversationData(updatedConversation)
                            .build()
            );
        } catch (Exception e) {
            log.warn("Failed to broadcast group update for conversation={}: {}", conversationId, e.getMessage());
        }
    }

    private void notifyGroupAvatarUpdated(Conversation conversation, String requesterId) {
        User requester = userRepository.findById(UUID.fromString(requesterId)).orElse(null);
        String requesterName = requester != null ? requester.getDisplayName() : "Someone";
        String content = requesterName + " changed the group avatar";

        messageService.sendSystemMessage(conversation.getId(), content);

        conversation.getParticipantIds().stream()
                .filter(participantId -> !participantId.equals(requesterId))
                .forEach(participantId -> notificationService.createAndPush(
                        NotificationType.GROUP_UPDATED,
                        requesterId,
                        participantId,
                        content,
                        conversation.getId()
                ));
    }

    private void broadcastRoleUpdate(String conversationId, GroupMember updatedMember) {
        try {
            Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
            if (conversation == null) return;
            ConversationResponse convResponse = conversationMapper.toResponse(conversation);
            GroupMemberResponse memberResponse = toMemberResponse(updatedMember);
            messagingTemplate.convertAndSend(
                    "/topic/conversation." + conversationId,
                    ChatEvent.builder()
                            .action(ChatEvent.ChatAction.ROLE_UPDATED)
                            .conversationData(convResponse)
                            .updatedMember(memberResponse)
                            .build()
            );
        } catch (Exception e) {
            log.warn("Failed to broadcast role update for conversation={}: {}", conversationId, e.getMessage());
        }
    }
}
