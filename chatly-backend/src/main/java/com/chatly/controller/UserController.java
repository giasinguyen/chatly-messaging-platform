package com.chatly.controller;

import com.chatly.dto.request.UserUpdateRequest;
import com.chatly.dto.request.DeviceTokenRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.PagedResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.dto.response.UserSocialStatsResponse;
import com.chatly.service.FollowService;
import com.chatly.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final FollowService followService;

    @GetMapping("/me")
    ApiResponse<UserResponse> getCurrentUser() {
        return ApiResponse.<UserResponse>builder()
                .result(userService.getCurrentUser())
                .build();
    }

    @GetMapping
    ApiResponse<List<UserResponse>> getAll() {
        return ApiResponse.<List<UserResponse>>builder()
                .result(userService.getAll())
                .build();
    }

    @GetMapping("/search")
    ApiResponse<PagedResponse<UserResponse>> search(
            @RequestParam("q") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<PagedResponse<UserResponse>>builder()
                .result(userService.search(keyword, page, size))
                .build();
    }

    @GetMapping("/{id}")
    ApiResponse<UserResponse> getById(@PathVariable UUID id) {
        return ApiResponse.<UserResponse>builder()
                .result(userService.getById(id))
                .build();
    }

    @GetMapping("/{id}/stats")
    ApiResponse<UserSocialStatsResponse> getSocialStats(@PathVariable UUID id) {
        return ApiResponse.<UserSocialStatsResponse>builder()
                .result(followService.getUserSocialStats(id.toString()))
                .build();
    }

    @PutMapping("/{id}")
    ApiResponse<UserResponse> update(@PathVariable UUID id, @RequestBody @Valid UserUpdateRequest request) {
        return ApiResponse.<UserResponse>builder()
                .result(userService.update(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    ApiResponse<Void> delete(@PathVariable UUID id) {
        userService.delete(id);
        return ApiResponse.<Void>builder()
                .message("User deleted successfully")
                .build();
    }

    @PostMapping("/device-token")
    ApiResponse<Void> addDeviceToken(@RequestBody @Valid DeviceTokenRequest request) {
        userService.addDeviceToken(request.getToken());
        return ApiResponse.<Void>builder()
                .message("Device token added successfully")
                .build();
    }

    @DeleteMapping("/device-token")
    ApiResponse<Void> removeDeviceToken(@RequestBody @Valid DeviceTokenRequest request) {
        userService.removeDeviceToken(request.getToken());
        return ApiResponse.<Void>builder()
                .message("Device token removed successfully")
                .build();
    }
}
