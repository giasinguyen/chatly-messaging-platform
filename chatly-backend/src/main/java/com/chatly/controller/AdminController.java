package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.AdminStatsResponse;
import com.chatly.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
                .code(1000)
                .message("Success")
                .result(adminService.getStats())
                .build();
    }

    @PutMapping("/users/{id}/suspend")
    public ApiResponse<Void> suspendUser(@PathVariable String id, @RequestParam boolean suspend) {
        log.info("Updating suspension status for user: {} to {}", id, suspend);
        adminService.suspendUser(id, suspend);
        return ApiResponse.<Void>builder()
                .code(1000)
                .message("User suspension status updated successfully")
                .build();
    }
}
