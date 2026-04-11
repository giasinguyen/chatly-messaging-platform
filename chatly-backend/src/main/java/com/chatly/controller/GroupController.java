package com.chatly.controller;

import com.chatly.dto.request.*;
import com.chatly.dto.response.*;
import com.chatly.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    /**
     * POST /api/groups/{conversationId}/members
     * Add a member to a group conversation.
     */
    @PostMapping("/{conversationId}/members")
    ApiResponse<GroupMemberResponse> addMember(
            @PathVariable String conversationId,
            @RequestBody @Valid AddMemberRequest request) {
        return ApiResponse.<GroupMemberResponse>builder()
                .result(groupService.addMember(conversationId, request.getUserId(), getAuthenticatedUserId()))
                .build();
    }

    /**
     * DELETE /api/groups/{conversationId}/members/{userId}
     * Remove a member from a group conversation.
     */
    @DeleteMapping("/{conversationId}/members/{userId}")
    ApiResponse<Void> removeMember(
            @PathVariable String conversationId,
            @PathVariable String userId) {
        groupService.removeMember(conversationId, userId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder()
                .message("Member removed successfully")
                .build();
    }

    /**
     * PUT /api/groups/{conversationId}/members/{userId}/role
     * Change the role of a group member.
     */
    @PutMapping("/{conversationId}/members/{userId}/role")
    ApiResponse<GroupMemberResponse> updateRole(
            @PathVariable String conversationId,
            @PathVariable String userId,
            @RequestBody @Valid UpdateRoleRequest request) {
        return ApiResponse.<GroupMemberResponse>builder()
                .result(groupService.updateRole(conversationId, userId, request, getAuthenticatedUserId()))
                .build();
    }

    /**
     * PUT /api/groups/{conversationId}
     * Update group conversation info (name, avatar).
     */
    @PutMapping("/{conversationId}")
    ApiResponse<ConversationResponse> updateGroup(
            @PathVariable String conversationId,
            @RequestBody GroupUpdateRequest request) {
        return ApiResponse.<ConversationResponse>builder()
                .result(groupService.updateGroup(conversationId, request, getAuthenticatedUserId()))
                .build();
    }

    /**
     * GET /api/groups/{conversationId}/members
     * Get all members of a group conversation.
     */
    @GetMapping("/{conversationId}/members")
    ApiResponse<List<GroupMemberResponse>> getMembers(@PathVariable String conversationId) {
        return ApiResponse.<List<GroupMemberResponse>>builder()
                .result(groupService.getMembers(conversationId, getAuthenticatedUserId()))
                .build();
    }

    // ── Invite Link ───────────────────────────────────────────────────

    @PostMapping("/{conversationId}/invite-link")
    ApiResponse<InviteLinkResponse> getOrCreateInviteLink(@PathVariable String conversationId) {
        return ApiResponse.<InviteLinkResponse>builder()
                .result(groupService.getOrCreateInviteLink(conversationId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{conversationId}/invite-link/reset")
    ApiResponse<InviteLinkResponse> resetInviteLink(@PathVariable String conversationId) {
        return ApiResponse.<InviteLinkResponse>builder()
                .result(groupService.resetInviteLink(conversationId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/join/{inviteToken}")
    ApiResponse<GroupMemberResponse> joinByInviteLink(@PathVariable String inviteToken) {
        return ApiResponse.<GroupMemberResponse>builder()
                .result(groupService.joinByInviteLink(inviteToken, getAuthenticatedUserId()))
                .build();
    }

    // ── Pending Join Requests ────────────────────────────────────────

    @GetMapping("/{conversationId}/pending")
    ApiResponse<List<PendingJoinResponse>> getPendingRequests(@PathVariable String conversationId) {
        return ApiResponse.<List<PendingJoinResponse>>builder()
                .result(groupService.getPendingRequests(conversationId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{conversationId}/pending/{userId}/approve")
    ApiResponse<GroupMemberResponse> approvePendingRequest(
            @PathVariable String conversationId,
            @PathVariable String userId) {
        return ApiResponse.<GroupMemberResponse>builder()
                .result(groupService.approvePendingRequest(conversationId, userId, getAuthenticatedUserId()))
                .build();
    }

    @DeleteMapping("/{conversationId}/pending/{userId}")
    ApiResponse<Void> rejectPendingRequest(
            @PathVariable String conversationId,
            @PathVariable String userId) {
        groupService.rejectPendingRequest(conversationId, userId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().message("Request rejected").build();
    }

    // ── Reminders ────────────────────────────────────────────────────

    @GetMapping("/{conversationId}/reminders")
    ApiResponse<List<GroupReminderResponse>> getReminders(@PathVariable String conversationId) {
        return ApiResponse.<List<GroupReminderResponse>>builder()
                .result(groupService.getReminders(conversationId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{conversationId}/reminders")
    ApiResponse<GroupReminderResponse> createReminder(
            @PathVariable String conversationId,
            @RequestBody @Valid GroupReminderRequest request) {
        return ApiResponse.<GroupReminderResponse>builder()
                .result(groupService.createReminder(conversationId, request, getAuthenticatedUserId()))
                .build();
    }

    @PatchMapping("/reminders/{reminderId}/toggle")
    ApiResponse<GroupReminderResponse> toggleReminder(@PathVariable String reminderId) {
        return ApiResponse.<GroupReminderResponse>builder()
                .result(groupService.toggleReminderComplete(reminderId, getAuthenticatedUserId()))
                .build();
    }

    @DeleteMapping("/reminders/{reminderId}")
    ApiResponse<Void> deleteReminder(@PathVariable String reminderId) {
        groupService.deleteReminder(reminderId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().message("Reminder deleted").build();
    }

    @PutMapping("/reminders/{reminderId}")
    ApiResponse<GroupReminderResponse> updateReminder(
            @PathVariable String reminderId,
            @RequestBody @Valid GroupReminderRequest request) {
        return ApiResponse.<GroupReminderResponse>builder()
                .result(groupService.updateReminder(reminderId, request, getAuthenticatedUserId()))
                .build();
    }

    // ── Notes ────────────────────────────────────────────────────────

    @GetMapping("/{conversationId}/notes")
    ApiResponse<List<GroupNoteResponse>> getNotes(@PathVariable String conversationId) {
        return ApiResponse.<List<GroupNoteResponse>>builder()
                .result(groupService.getNotes(conversationId, getAuthenticatedUserId()))
                .build();
    }

    @PostMapping("/{conversationId}/notes")
    ApiResponse<GroupNoteResponse> createNote(
            @PathVariable String conversationId,
            @RequestBody @Valid GroupNoteRequest request) {
        return ApiResponse.<GroupNoteResponse>builder()
                .result(groupService.createNote(conversationId, request, getAuthenticatedUserId()))
                .build();
    }

    @PutMapping("/notes/{noteId}")
    ApiResponse<GroupNoteResponse> updateNote(
            @PathVariable String noteId,
            @RequestBody @Valid GroupNoteRequest request) {
        return ApiResponse.<GroupNoteResponse>builder()
                .result(groupService.updateNote(noteId, request, getAuthenticatedUserId()))
                .build();
    }

    @DeleteMapping("/notes/{noteId}")
    ApiResponse<Void> deleteNote(@PathVariable String noteId) {
        groupService.deleteNote(noteId, getAuthenticatedUserId());
        return ApiResponse.<Void>builder().message("Note deleted").build();
    }

    // ── Auth helper ──────────────────────────────────────────────────

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getPrincipal().toString();
    }
}
