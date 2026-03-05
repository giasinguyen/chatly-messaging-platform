package com.chatly.controller;

import com.chatly.dto.request.UserUpdateRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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

    @GetMapping("/{id}")
    ApiResponse<UserResponse> getById(@PathVariable UUID id) {
        return ApiResponse.<UserResponse>builder()
                .result(userService.getById(id))
                .build();
    }

    @PutMapping("/{id}")
    ApiResponse<UserResponse> update(@PathVariable UUID id, @RequestBody UserUpdateRequest request) {
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
}
