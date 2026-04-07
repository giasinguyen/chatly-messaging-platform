package com.chatly.controller;

import com.chatly.exception.AppException;
import com.chatly.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class EmailVerificationViewController {

    private final AuthService authService;

    @GetMapping("/verify-email")
    public String verifyEmail(@RequestParam("token") String token) {
        try {
            authService.verifyEmailByToken(token);
            return "email-verification-success";
        } catch (AppException ex) {
            return "email-verification-reject";
        }
    }
}
