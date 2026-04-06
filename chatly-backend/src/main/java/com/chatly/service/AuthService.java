package com.chatly.service;

import com.chatly.dto.request.LoginRequest;
import com.chatly.dto.request.LogoutRequest;
import com.chatly.dto.request.RefreshTokenRequest;
import com.chatly.dto.request.RegisterRequest;
import com.chatly.dto.request.ResendVerificationRequest;
import com.chatly.dto.request.IntrospectRequest;
import com.chatly.dto.response.AuthResponse;
import com.chatly.dto.response.IntrospectResponse;
import com.chatly.dto.response.RegisterResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.UserMapper;
import com.chatly.model.postgres.EmailVerificationOtp;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.EmailVerificationOtpRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final UserMapper userMapper;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailVerificationOtpRepository emailVerificationOtpRepository;
    private final EmailVerificationMailService emailVerificationMailService;

    @Value("${app.auth.verification.expiration-minutes:15}")
    private long verificationExpirationMinutes;

    @Value("${app.auth.verification.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.auth.verification-link-base-url:http://localhost:8080/api/auth/verify-email}")
    private String verificationLinkBaseUrl;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USERNAME_ALREADY_EXISTS);
        }

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new AppException(ErrorCode.EMAIL_REQUIRED);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            if (userRepository.existsByPhone(request.getPhone())) {
                throw new AppException(ErrorCode.PHONE_ALREADY_EXISTS);
            }
        }

        User user = User.builder()
            .username(request.getUsername())
            .email(request.getEmail())
            .phone(request.getPhone())
            .dob(request.getDob())
            .password(passwordEncoder.encode(request.getPassword()))
            .displayName(request.getDisplayName())
            .emailVerified(false)
            .build();

        user = userRepository.save(user);
        generateAndSendVerificationLink(user);

        return RegisterResponse.builder()
            .message("Registration successful. Please verify your email.")
            .userId(user.getId().toString())
            .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameOrEmailOrPhone(
                request.getIdentifier(), request.getIdentifier(), request.getIdentifier())
            .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (!user.isEmailVerified()) {
            throw new AppException(
                ErrorCode.EMAIL_NOT_VERIFIED,
                Map.of("userId", user.getId().toString())
            );
        }

        return generateAuthResponse(user);
    }

    @Transactional
    public void verifyEmailByToken(String token) {
        EmailVerificationOtp emailVerification = emailVerificationOtpRepository
            .findTopByVerificationTokenAndUsedFalseOrderByCreatedAtDesc(token)
            .orElseThrow(() -> new AppException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID));

        if (emailVerification.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID);
        }

        User user = userRepository.findById(emailVerification.getUserId())
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        emailVerification.setUsed(true);
        emailVerificationOtpRepository.save(emailVerification);

        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            userRepository.save(user);
        }
    }

    @Transactional
    public void resendVerification(ResendVerificationRequest request) {
        User user = userRepository.findById(request.getUserId())
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.isEmailVerified()) {
            return;
        }

        Instant rateLimitTime = Instant.now().minusSeconds(resendCooldownSeconds);
        if (emailVerificationOtpRepository.existsByUserIdAndCreatedAtAfter(user.getId(), rateLimitTime)) {
            throw new AppException(ErrorCode.EMAIL_VERIFICATION_RESEND_TOO_SOON);
        }

        generateAndSendVerificationLink(user);
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtProvider.validateToken(refreshToken)) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        // Check if refresh token is blacklisted
        if (tokenBlacklistService.isTokenBlacklisted(refreshToken)) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        String userId = jwtProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(UUID.fromString(userId))
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return generateAuthResponse(user);
    }

    public void logout(LogoutRequest request) {
        String token = request.getToken();
        String refreshToken = request.getRefreshToken();

        // Validate and blacklist access token
        if (token != null && !token.isBlank() && jwtProvider.validateToken(token)) {
            long expirationTime = jwtProvider.getExpirationTimeInSeconds(token);
            if (expirationTime > 0) {
                tokenBlacklistService.blacklistToken(token, expirationTime);
            }
        }

        // Validate and blacklist refresh token if provided
        if (refreshToken != null && !refreshToken.isBlank() && jwtProvider.validateToken(refreshToken)) {
            long expirationTime = jwtProvider.getExpirationTimeInSeconds(refreshToken);
            if (expirationTime > 0) {
                tokenBlacklistService.blacklistToken(refreshToken, expirationTime);
            }
        }
    }

    public IntrospectResponse introspect(IntrospectRequest request) {
        String token = request.getToken();
        boolean isValid = true;
        
        try {
            isValid = jwtProvider.validateToken(token) && !tokenBlacklistService.isTokenBlacklisted(token);
        } catch (Exception e) {
            isValid = false;
        }

        return IntrospectResponse.builder()
            .valid(isValid)
            .build();
    }

    private void generateAndSendVerificationLink(User user) {
        emailVerificationOtpRepository.markAllUnusedAsUsed(user.getId());

        String verificationToken = UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
        EmailVerificationOtp emailVerification = EmailVerificationOtp.builder()
            .userId(user.getId())
            .verificationToken(verificationToken)
            .expiresAt(Instant.now().plusSeconds(verificationExpirationMinutes * 60))
            .used(false)
            .build();
        emailVerificationOtpRepository.save(emailVerification);
        String verificationLink = verificationLinkBaseUrl
            + "?token=" + URLEncoder.encode(verificationToken, StandardCharsets.UTF_8);
        emailVerificationMailService.sendVerificationLink(user, verificationLink);
    }

    private AuthResponse generateAuthResponse(User user) {
        String token = jwtProvider.generateToken(user.getId().toString());
        String refreshToken = jwtProvider.generateRefreshToken(user.getId().toString());
        UserResponse userResponse = userMapper.toResponse(user);

        return AuthResponse.builder()
            .token(token)
            .refreshToken(refreshToken)
            .user(userResponse)
            .build();
    }
}
