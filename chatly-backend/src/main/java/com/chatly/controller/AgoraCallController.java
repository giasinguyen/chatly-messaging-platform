package com.chatly.controller;

import com.chatly.dto.request.AgoraTokenRequest;
import com.chatly.dto.response.AgoraTokenResponse;
import com.chatly.dto.response.ApiResponse;
import com.chatly.service.AgoraTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class AgoraCallController {

    private final AgoraTokenService agoraTokenService;

    @PostMapping("/agora-token")
    ApiResponse<AgoraTokenResponse> createAgoraToken(@RequestBody @Valid AgoraTokenRequest request) {
        return ApiResponse.<AgoraTokenResponse>builder()
                .result(agoraTokenService.createToken(getAuthenticatedUserId(), request))
                .build();
    }

    private String getAuthenticatedUserId() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal().toString();
    }
}
