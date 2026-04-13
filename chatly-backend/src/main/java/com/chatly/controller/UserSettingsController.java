package com.chatly.controller;

import com.chatly.dto.request.UserSettingsRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.model.mongo.UserSettings;
import com.chatly.service.UserSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users/me/settings")
@RequiredArgsConstructor
public class UserSettingsController {

    private final UserSettingsService userSettingsService;

    @GetMapping
    ApiResponse<UserSettings> getSettings() {
        return ApiResponse.<UserSettings>builder()
                .result(userSettingsService.getOrCreateDefault(getAuthenticatedUserId()))
                .build();
    }

    @PutMapping
    ApiResponse<UserSettings> updateSettings(@RequestBody UserSettingsRequest request) {
        return ApiResponse.<UserSettings>builder()
                .result(userSettingsService.update(getAuthenticatedUserId(), request))
                .build();
    }

    @PatchMapping("/{section}")
    ApiResponse<UserSettings> updateSection(
            @PathVariable String section,
            @RequestBody Map<String, Object> data) {
        return ApiResponse.<UserSettings>builder()
                .result(userSettingsService.updateSection(getAuthenticatedUserId(), section, data))
                .build();
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getPrincipal().toString();
    }
}
