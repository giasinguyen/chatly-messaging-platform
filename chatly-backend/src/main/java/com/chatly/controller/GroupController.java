package com.chatly.controller;

import com.chatly.dto.request.AddMemberRequest;
import com.chatly.dto.request.GroupUpdateRequest;
import com.chatly.dto.request.UpdateRoleRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.dto.response.GroupMemberResponse;
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

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getPrincipal().toString();
    }
}
