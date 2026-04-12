package com.chatly.service;

import com.chatly.dto.request.LoginRequest;
import com.chatly.dto.request.ChangePasswordRequest;
import com.chatly.dto.request.ForgotPasswordRequest;
import com.chatly.dto.request.LogoutRequest;
import com.chatly.dto.request.RefreshTokenRequest;
import com.chatly.dto.request.RegisterRequest;
import com.chatly.dto.request.ResendVerificationRequest;
import com.chatly.dto.request.IntrospectRequest;
import com.chatly.dto.session.StartLoginSessionResult;
import com.chatly.dto.response.AuthResponse;
import com.chatly.dto.response.IntrospectResponse;
import com.chatly.dto.response.RegisterResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.UserMapper;
import com.chatly.model.enums.ClientPlatform;
import com.chatly.model.postgres.EmailVerificationOtp;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.EmailVerificationOtpRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.security.JwtProvider;
import com.chatly.security.PasswordChangeTokenValidator;
import com.chatly.security.SessionTokenValidator;
import com.chatly.util.ClientPlatformParser;
import com.chatly.util.HttpRequestMeta;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.servlet.http.HttpServletRequest;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final UserMapper userMapper;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailVerificationOtpRepository emailVerificationOtpRepository;
    private final EmailVerificationMailService emailVerificationMailService;
    private final PasswordChangeTokenValidator passwordChangeTokenValidator;
    private final SessionTokenValidator sessionTokenValidator;
    private final UserSessionService userSessionService;
    private final GeoIpLookupService geoIpLookupService;
    private final AsyncNotificationService asyncNotificationService;

    @Value("${app.auth.verification.expiration-minutes:15}")
    private long verificationExpirationMinutes;

    @Value("${app.auth.verification.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.auth.verification-link-base-url:http://localhost:8080/api/auth/verify-email}")
    private String verificationLinkBaseUrl;
    private static final String RANDOM_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    private static final int RANDOM_PASSWORD_LENGTH = 12;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

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

        Instant now = Instant.now();
        User user = User.builder()
            .username(request.getUsername())
            .email(request.getEmail())
            .phone(request.getPhone())
            .dob(request.getDob())
            .password(passwordEncoder.encode(request.getPassword()))
            .displayName(request.getDisplayName())
            .emailVerified(false)
            .passwordChangedAt(now)
            .build();

        user = userRepository.save(user);
        generateAndSendVerificationLink(user);

        return RegisterResponse.builder()
            .message("Registration successful. Please verify your email.")
            .userId(user.getId().toString())
            .build();
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
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

        ClientPlatform platform = ClientPlatformParser.parse(httpRequest.getHeader("X-Client-Platform"));
        String deviceHeader = httpRequest.getHeader("X-Device-Label");
        String userAgent = httpRequest.getHeader("User-Agent");
        String ip = HttpRequestMeta.clientIp(httpRequest);
        String location = geoIpLookupService.summarizeLocation(ip);
        String deviceLabel = resolveDeviceLabel(deviceHeader, userAgent);

        StartLoginSessionResult sessionResult = userSessionService.startNewLoginSession(
            user, platform, deviceLabel, userAgent, ip, location
        );
        if (sessionResult.replacedSession() != null && StringUtils.hasText(user.getEmail())) {
            asyncNotificationService.sendConcurrentLoginAlertAsync(
                user,
                platform,
                deviceLabel,
                ip,
                location,
                sessionResult.replacedSession()
            );
        }
        return buildTokenResponse(user, sessionResult.session().getId());
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String userId = authentication.getPrincipal().toString();
        User user = userRepository.findById(UUID.fromString(userId))
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.CURRENT_PASSWORD_INCORRECT);
        }

        Instant changedAt = Instant.now();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(changedAt);
        userRepository.save(user);
        userSessionService.revokeAllForUser(user.getId());

        if (StringUtils.hasText(user.getEmail())) {
            asyncNotificationService.sendPasswordChangedNoticeAsync(user, changedAt);
        }
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String newPassword = generateRandomPassword();
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setPasswordChangedAt(Instant.now());
            userRepository.save(user);
            userSessionService.revokeAllForUser(user.getId());
            emailVerificationMailService.sendNewPassword(user, newPassword);
        });
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

        if (!passwordChangeTokenValidator.isTokenValidAgainstPasswordChange(refreshToken)) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        String sessionIdStr = jwtProvider.getSessionIdFromToken(refreshToken);
        if (!StringUtils.hasText(sessionIdStr)) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        String userId = jwtProvider.getUserIdFromToken(refreshToken);
        UUID userUuid = UUID.fromString(userId);
        UUID sessionUuid = UUID.fromString(sessionIdStr);
        userSessionService.requireActiveSession(sessionUuid, userUuid);
        userSessionService.touchSession(sessionUuid);

        User user = userRepository.findById(userUuid)
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return buildTokenResponse(user, sessionUuid);
    }

    public void logout(LogoutRequest request) {
        String token = request.getToken();
        String refreshToken = request.getRefreshToken();

        if (token != null && !token.isBlank() && jwtProvider.validateToken(token)) {
            String jti = jwtProvider.getSessionIdFromToken(token);
            if (StringUtils.hasText(jti)) {
                try {
                    UUID sid = UUID.fromString(jti);
                    UUID uid = UUID.fromString(jwtProvider.getUserIdFromToken(token));
                    userSessionService.revokeSession(sid, uid);
                } catch (Exception e) {
                    log.debug("Could not revoke session on logout: {}", e.getMessage());
                }
            }
        }

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
            isValid = jwtProvider.validateToken(token)
                && !tokenBlacklistService.isTokenBlacklisted(token)
                && passwordChangeTokenValidator.isTokenValidAgainstPasswordChange(token)
                && sessionTokenValidator.isSessionTokenAcceptable(token);
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

    private AuthResponse buildTokenResponse(User user, UUID sessionId) {
        String uid = user.getId().toString();
        String sid = sessionId.toString();
        String token = jwtProvider.generateAccessToken(uid, sid);
        String refreshToken = jwtProvider.generateRefreshToken(uid, sid);
        UserResponse userResponse = userMapper.toResponse(user);

        return AuthResponse.builder()
            .token(token)
            .refreshToken(refreshToken)
            .sessionId(sid)
            .user(userResponse)
            .build();
    }

    private static String resolveDeviceLabel(String deviceHeader, String userAgent) {
        if (StringUtils.hasText(deviceHeader)) {
            return deviceHeader.trim();
        }
        if (!StringUtils.hasText(userAgent)) {
            return "Unknown device";
        }
        return userAgent.length() > 200 ? userAgent.substring(0, 200) + "…" : userAgent;
    }

    private String generateRandomPassword() {
        StringBuilder password = new StringBuilder(RANDOM_PASSWORD_LENGTH);
        for (int i = 0; i < RANDOM_PASSWORD_LENGTH; i++) {
            int index = SECURE_RANDOM.nextInt(RANDOM_PASSWORD_CHARS.length());
            password.append(RANDOM_PASSWORD_CHARS.charAt(index));
        }
        return password.toString();
    }
}
