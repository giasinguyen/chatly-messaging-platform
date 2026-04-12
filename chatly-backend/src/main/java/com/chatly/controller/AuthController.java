package com.chatly.controller;

import com.chatly.dto.request.LoginRequest;
import com.chatly.dto.request.ChangePasswordRequest;
import com.chatly.dto.request.ForgotPasswordRequest;
import com.chatly.dto.request.LogoutRequest;
import com.chatly.dto.request.RefreshTokenRequest;
import com.chatly.dto.request.RegisterRequest;
import com.chatly.dto.request.ResendVerificationRequest;
import com.chatly.dto.request.IntrospectRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.AuthResponse;
import com.chatly.dto.response.IntrospectResponse;
import com.chatly.dto.response.RegisterResponse;
import com.chatly.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    ApiResponse<RegisterResponse> register(@RequestBody @Valid RegisterRequest request) {
        return ApiResponse.<RegisterResponse>builder()
            .result(authService.register(request))
            .build();
    }

    @PostMapping("/login")
    ApiResponse<AuthResponse> login(
        @RequestBody @Valid LoginRequest request,
        HttpServletRequest httpRequest) {
        return ApiResponse.<AuthResponse>builder()
            .result(authService.login(request, httpRequest))
            .build();
    }

    @PostMapping("/resend-verification")
    ApiResponse<Void> resendVerification(@RequestBody @Valid ResendVerificationRequest request) {
        authService.resendVerification(request);
        return ApiResponse.<Void>builder()
            .message("Verification link resent successfully")
            .build();
    }

    @PostMapping("/forgot-password")
    ApiResponse<Void> forgotPassword(@RequestBody @Valid ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.<Void>builder()
            .message("If the email exists, a new password has been sent.")
            .build();
    }

    @PostMapping("/change-password")
    ApiResponse<Void> changePassword(@RequestBody @Valid ChangePasswordRequest request) {
        authService.changePassword(request);
        return ApiResponse.<Void>builder()
            .message("Password changed successfully")
            .build();
    }

    @PostMapping("/refresh")
    ApiResponse<AuthResponse> refreshToken(@RequestBody @Valid RefreshTokenRequest request) {
        return ApiResponse.<AuthResponse>builder()
            .result(authService.refreshToken(request))
            .build();
    }

    @PostMapping("/logout")
    ApiResponse<Void> logout(@RequestBody @Valid LogoutRequest request) {
        authService.logout(request);
        return ApiResponse.<Void>builder()
            .message("Logout successful")
            .build();
    }

    @PostMapping("/introspect")
    ApiResponse<IntrospectResponse> introspect(@RequestBody @Valid IntrospectRequest request) {
        return ApiResponse.<IntrospectResponse>builder()
            .result(authService.introspect(request))
            .build();
    }
}
