package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.NotificationResponse;
import com.chatly.model.enums.NotificationScope;
import com.chatly.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    ApiResponse<List<NotificationResponse>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "ALL") NotificationScope scope) {
        return ApiResponse.<List<NotificationResponse>>builder()
                .result(notificationService.getNotifications(getAuthenticatedUserId(), page, size, scope))
                .build();
    }

    @GetMapping("/unread-count")
    ApiResponse<Long> getUnreadCount(@RequestParam(defaultValue = "ALL") NotificationScope scope) {
        String userId = getAuthenticatedUserId();
        return ApiResponse.<Long>builder()
                .result(notificationService.getUnreadCount(userId, scope))
                .build();
    }

    @PutMapping("/{notificationId}/read")
    ApiResponse<NotificationResponse> markAsRead(@PathVariable String notificationId) {
        return ApiResponse.<NotificationResponse>builder()
                .result(notificationService.markAsRead(notificationId, getAuthenticatedUserId()))
                .build();
    }

    @PutMapping("/read-all")
    ApiResponse<Void> markAllAsRead(@RequestParam(defaultValue = "ALL") NotificationScope scope) {
        notificationService.markAllAsRead(getAuthenticatedUserId(), scope);
        return ApiResponse.<Void>builder().message("All notifications marked as read").build();
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("User not authenticated");
        }
        return authentication.getPrincipal().toString();
    }
}
