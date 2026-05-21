package com.chatly.controller;

import com.chatly.dto.request.CreateReportRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.ReportResponse;
import com.chatly.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    ApiResponse<ReportResponse> create(@RequestBody @Valid CreateReportRequest request) {
        return ApiResponse.<ReportResponse>builder()
                .result(reportService.createPostReport(getAuthenticatedUserId(), request))
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
