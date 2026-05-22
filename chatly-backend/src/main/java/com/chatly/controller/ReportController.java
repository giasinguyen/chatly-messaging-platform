package com.chatly.controller;

import com.chatly.dto.request.CreateReportRequest;
import com.chatly.dto.request.CreateUserReportRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ReportResponse;
import com.chatly.model.enums.ReportStatus;
import com.chatly.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final ReportService reportService;

    @PostMapping
    ApiResponse<ReportResponse> create(@RequestBody @Valid CreateReportRequest request) {
        return ApiResponse.<ReportResponse>builder()
                .result(reportService.createPostReport(getAuthenticatedUserId(), request))
                .build();
    }

    @PostMapping("/users")
    ApiResponse<ReportResponse> createUserReport(@RequestBody @Valid CreateUserReportRequest request) {
        return ApiResponse.<ReportResponse>builder()
                .result(reportService.createUserReport(getAuthenticatedUserId(), request))
                .build();
    }

    @GetMapping
    ApiResponse<Page<ReportResponse>> list(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int pageSize = Math.min(size, DEFAULT_PAGE_SIZE);
        Page<ReportResponse> reports = reportService.listReports(status, PageRequest.of(page, pageSize));
        return ApiResponse.<Page<ReportResponse>>builder()
                .result(reports)
                .build();
    }

    @PutMapping("/{id}/status")
    ApiResponse<ReportResponse> updateStatus(
            @PathVariable String id,
            @RequestParam ReportStatus status
    ) {
        ReportResponse updated = reportService.updateReportStatus(id, status);
        return ApiResponse.<ReportResponse>builder()
                .result(updated)
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
