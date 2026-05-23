package com.chatly.controller;

import com.chatly.dto.request.AdminCreateUserRequest;
import com.chatly.dto.request.AdminSettingsRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.AdminAuditLogResponse;
import com.chatly.dto.response.AdminSettingsResponse;
import com.chatly.dto.response.AdminStatsResponse;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.dto.response.MessageResponse;
import com.chatly.dto.response.NotificationResponse;
import com.chatly.dto.response.PagedResponse;
import com.chatly.dto.response.PostResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.enums.Role;
import com.chatly.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ApiResponse<AdminStatsResponse> getStats() {
        log.info("Fetching admin statistics");
        return ApiResponse.<AdminStatsResponse>builder()
                .message("Success")
                .result(adminService.getStats())
                .build();
    }

    @GetMapping("/users")
    public ApiResponse<PagedResponse<UserResponse>> listUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            Pageable pageable) {
        return ApiResponse.<PagedResponse<UserResponse>>builder()
                .result(adminService.listUsers(q, status, pageable))
                .build();
    }

    @PostMapping("/users")
    public ApiResponse<UserResponse> createUser(@RequestBody @Valid AdminCreateUserRequest request) {
        return ApiResponse.<UserResponse>builder()
                .result(adminService.createUser(getAuthenticatedUserId(), request))
                .build();
    }

    @GetMapping("/users/{id}")
    public ApiResponse<UserResponse> getUser(@PathVariable String id) {
        return ApiResponse.<UserResponse>builder()
                .result(adminService.getUser(id))
                .build();
    }

    @PutMapping("/users/{id}/role")
    public ApiResponse<UserResponse> setUserRole(@PathVariable String id, @RequestParam Role role) {
        log.info("Setting role {} for user: {}", role, id);
        return ApiResponse.<UserResponse>builder()
                .result(adminService.setUserRole(getAuthenticatedUserId(), id, role))
                .build();
    }

    @PutMapping("/users/{id}/suspend")
    public ApiResponse<Void> suspendUser(@PathVariable String id, @RequestParam boolean suspend) {
        log.info("Updating suspension status for user: {} to {}", id, suspend);
        adminService.suspendUser(getAuthenticatedUserId(), id, suspend);
        return ApiResponse.<Void>builder()
                .message("User suspension status updated successfully")
                .build();
    }

    @GetMapping("/posts")
    public ApiResponse<PagedResponse<PostResponse>> listPosts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String hashtag,
            Pageable pageable) {
        return ApiResponse.<PagedResponse<PostResponse>>builder()
                .result(adminService.listPosts(q, hashtag, pageable))
                .build();
    }

    @GetMapping("/posts/{id}")
    public ApiResponse<PostResponse> getPost(@PathVariable String id) {
        return ApiResponse.<PostResponse>builder()
                .result(adminService.getPost(id))
                .build();
    }

    @DeleteMapping("/posts/{id}")
    public ApiResponse<Void> deletePost(@PathVariable String id) {
        adminService.deletePost(getAuthenticatedUserId(), id);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/conversations")
    public ApiResponse<PagedResponse<ConversationResponse>> listConversations(
            @RequestParam(required = false) ConversationType type,
            @RequestParam(required = false) String q,
            Pageable pageable) {
        return ApiResponse.<PagedResponse<ConversationResponse>>builder()
                .result(adminService.listConversations(type, q, pageable))
                .build();
    }

    @GetMapping("/conversations/{id}")
    public ApiResponse<ConversationResponse> getConversation(@PathVariable String id) {
        return ApiResponse.<ConversationResponse>builder()
                .result(adminService.getConversation(id))
                .build();
    }

    @DeleteMapping("/conversations/{id}")
    public ApiResponse<Void> deleteConversation(@PathVariable String id) {
        adminService.deleteConversation(getAuthenticatedUserId(), id);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/messages")
    public ApiResponse<PagedResponse<MessageResponse>> listMessages(
            @RequestParam(required = false) String conversationId,
            @RequestParam(required = false) String senderId,
            @RequestParam(required = false) String q,
            Pageable pageable) {
        return ApiResponse.<PagedResponse<MessageResponse>>builder()
                .result(adminService.listMessages(conversationId, senderId, q, pageable))
                .build();
    }

    @GetMapping("/messages/{id}")
    public ApiResponse<MessageResponse> getMessage(@PathVariable String id) {
        return ApiResponse.<MessageResponse>builder()
                .result(adminService.getMessage(id))
                .build();
    }

    @DeleteMapping("/messages/{id}")
    public ApiResponse<Void> deleteMessage(@PathVariable String id) {
        adminService.deleteMessage(getAuthenticatedUserId(), id);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/notifications")
    public ApiResponse<PagedResponse<NotificationResponse>> listNotifications(
            @RequestParam(required = false) NotificationType type,
            @RequestParam(required = false) Boolean read,
            Pageable pageable) {
        return ApiResponse.<PagedResponse<NotificationResponse>>builder()
                .result(adminService.listNotifications(type, read, pageable))
                .build();
    }

    @GetMapping("/notifications/{id}")
    public ApiResponse<NotificationResponse> getNotification(@PathVariable String id) {
        return ApiResponse.<NotificationResponse>builder()
                .result(adminService.getNotification(id))
                .build();
    }

    @GetMapping("/audit-logs")
    public ApiResponse<PagedResponse<AdminAuditLogResponse>> listAuditLogs(
            @RequestParam(required = false) String type,
            Pageable pageable) {
        return ApiResponse.<PagedResponse<AdminAuditLogResponse>>builder()
                .result(adminService.listAuditLogs(type, pageable))
                .build();
    }

    @GetMapping("/settings")
    public ApiResponse<AdminSettingsResponse> getSettings() {
        return ApiResponse.<AdminSettingsResponse>builder()
                .result(adminService.getSettings())
                .build();
    }

    @PutMapping("/settings")
    public ApiResponse<AdminSettingsResponse> updateSettings(
            @RequestBody @Valid AdminSettingsRequest request) {
        return ApiResponse.<AdminSettingsResponse>builder()
                .result(adminService.updateSettings(getAuthenticatedUserId(), request))
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
