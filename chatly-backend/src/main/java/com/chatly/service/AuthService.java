package com.chatly.service;

import com.chatly.dto.request.LoginRequest;
import com.chatly.dto.request.ChangePasswordRequest;
import com.chatly.dto.request.ForgotPasswordRequest;
import com.chatly.dto.request.LogoutRequest;
import com.chatly.dto.request.RefreshTokenRequest;
import com.chatly.dto.request.RegisterRequest;
import com.chatly.dto.request.ResendVerificationRequest;
import com.chatly.dto.request.IntrospectRequest;
import com.chatly.dto.geo.GeoIpResolution;
import com.chatly.dto.session.StartLoginSessionResult;
import com.chatly.dto.response.AuthResponse;
import com.chatly.dto.response.IntrospectResponse;
import com.chatly.dto.response.RegisterResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.dto.request.QrLoginConfirmRequest;
import com.chatly.dto.response.QrLoginGenerateResponse;
import com.chatly.dto.response.QrLoginStatusResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.UserMapper;
import com.chatly.model.enums.ClientPlatform;
import com.chatly.model.enums.QrLoginStatus;
import com.chatly.model.enums.Role;
import com.chatly.model.postgres.EmailVerificationOtp;
import com.chatly.model.postgres.User;
import com.chatly.model.postgres.QrLoginToken;
import com.chatly.repository.postgres.EmailVerificationOtpRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.repository.postgres.QrLoginTokenRepository;
import com.chatly.security.JwtProvider;
import com.chatly.security.PasswordChangeTokenValidator;
import com.chatly.security.SessionTokenValidator;
import com.chatly.util.ClientPlatformParser;
import com.chatly.util.HttpRequestMeta;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
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
    private final TransactionTemplate transactionTemplate;
    private final QrLoginTokenRepository qrLoginTokenRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.auth.verification.expiration-minutes:15}")
    private long verificationExpirationMinutes;

    @Value("${app.auth.verification.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.auth.verification-link-base-url:http://localhost:8080/api/auth/verify-email}")
    private String verificationLinkBaseUrl;
    /** No 0/O, 1/l/I, or ! (often confused when retyped from email). */
    private static final String RANDOM_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%^&*";
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
        String identifier = request.getIdentifier() != null ? request.getIdentifier().trim() : "";
        User user = userRepository.findByLoginIdentifier(identifier)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        String rawPassword = request.getPassword() != null ? request.getPassword().trim() : "";
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (!user.isEmailVerified()) {
            throw new AppException(
                    ErrorCode.EMAIL_NOT_VERIFIED,
                    Map.of("userId", user.getId().toString()));
        }

        if (user.isSuspended()) {
            throw new AppException(ErrorCode.USER_SUSPENDED);
        }

        ClientPlatform platform = ClientPlatformParser.parse(httpRequest.getHeader("X-Client-Platform"));
        String deviceHeader = httpRequest.getHeader("X-Device-Label");
        String userAgent = httpRequest.getHeader("User-Agent");
        String ip = HttpRequestMeta.clientIp(httpRequest);
        GeoIpResolution geo = geoIpLookupService.resolve(ip);
        String location = geo != null ? geo.locationLabel() : null;
        String deviceLabel = resolveDeviceLabel(deviceHeader, userAgent);

        StartLoginSessionResult sessionResult = userSessionService.startNewLoginSession(
                user, platform, deviceLabel, userAgent, ip, geo);
        if (sessionResult.replacedSession() != null && StringUtils.hasText(user.getEmail())) {
            asyncNotificationService.sendConcurrentLoginAlertAsync(
                    user,
                    platform,
                    deviceLabel,
                    ip,
                    location,
                    sessionResult.replacedSession());
        }
        return buildTokenResponse(user, sessionResult.session().getId());
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        String newPw = request.getNewPassword() != null ? request.getNewPassword().trim() : "";
        String confirmPw = request.getConfirmPassword() != null ? request.getConfirmPassword().trim() : "";
        String currentPw = request.getCurrentPassword() != null ? request.getCurrentPassword().trim() : "";

        if (!newPw.equals(confirmPw)) {
            throw new AppException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        Object principal = authentication.getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String userId = principal.toString();
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(currentPw, user.getPassword())) {
            throw new AppException(ErrorCode.CURRENT_PASSWORD_INCORRECT);
        }

        Instant changedAt = Instant.now();
        user.setPassword(passwordEncoder.encode(newPw));
        user.setPasswordChangedAt(changedAt);
        userRepository.saveAndFlush(user);
        userSessionService.revokeAllForUser(user.getId());

        if (StringUtils.hasText(user.getEmail())) {
            asyncNotificationService.sendPasswordChangedNoticeAsync(user, changedAt);
        }
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim();
        if (!StringUtils.hasText(email)) {
            return;
        }
        // Match registration regardless of stored email casing (avoids “email sent but
        // login still old password” confusion)
        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            final String newPassword = generateRandomPassword();
            final UUID userId = user.getId();
            transactionTemplate.executeWithoutResult(status -> {
                User u = userRepository.findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                u.setPassword(passwordEncoder.encode(newPassword));
                u.setPasswordChangedAt(Instant.now());
                userRepository.saveAndFlush(u);
                userSessionService.revokeAllForUser(userId);

                // Email only after successful commit; then re-read DB and verify hash matches
                // plaintext.
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        userRepository.findById(userId).ifPresentOrElse(mailUser -> {
                            if (!passwordEncoder.matches(newPassword, mailUser.getPassword())) {
                                log.error(
                                        "Password reset: hash in DB does not match new password for user {} — email not sent",
                                        userId);
                                return;
                            }
                            emailVerificationMailService.sendNewPassword(mailUser, newPassword);
                        }, () -> log.error("Password reset: user {} missing after commit — email not sent", userId));
                    }
                });
            });
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
        String role = user.getRole() != null ? user.getRole().name() : Role.USER.name();
        String token = jwtProvider.generateAccessToken(uid, sid, role);
        String refreshToken = jwtProvider.generateRefreshToken(uid, sid, role);
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

    public QrLoginGenerateResponse generateQrLogin(HttpServletRequest httpRequest) {
        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusSeconds(120); // 2 minutes

        String ip = HttpRequestMeta.clientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        QrLoginToken qrToken = QrLoginToken.builder()
                .token(token)
                .status(QrLoginStatus.PENDING)
                .expiresAt(expiresAt)
                .ipAddress(ip)
                .userAgent(userAgent)
                .build();

        qrLoginTokenRepository.save(qrToken);

        return QrLoginGenerateResponse.builder()
                .token(token)
                .expiresAt(expiresAt)
                .build();
    }

    public QrLoginStatusResponse getQrLoginStatus(String token) {
        QrLoginToken qrToken = qrLoginTokenRepository.findById(token)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_TOKEN));

        if (qrToken.getStatus() == QrLoginStatus.PENDING && qrToken.getExpiresAt().isBefore(Instant.now())) {
            qrToken.setStatus(QrLoginStatus.EXPIRED);
            qrLoginTokenRepository.save(qrToken);
        }

        QrLoginStatusResponse.QrLoginStatusResponseBuilder builder = QrLoginStatusResponse.builder()
                .status(qrToken.getStatus());

        if (qrToken.getStatus() == QrLoginStatus.SUCCESS && StringUtils.hasText(qrToken.getAuthResponseData())) {
            try {
                builder.result(objectMapper.readValue(qrToken.getAuthResponseData(), AuthResponse.class));
            } catch (Exception e) {
                log.error("Failed to deserialize auth response from QR token", e);
            }
        }

        return builder.build();
    }

    public void confirmQrLogin(QrLoginConfirmRequest request) {
        QrLoginToken qrToken = qrLoginTokenRepository.findById(request.getToken())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_TOKEN));

        if (qrToken.getStatus() != QrLoginStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        if (qrToken.getExpiresAt().isBefore(Instant.now())) {
            transactionTemplate.executeWithoutResult(status -> {
                QrLoginToken token = qrLoginTokenRepository.findById(request.getToken()).orElse(null);
                if (token != null) {
                    token.setStatus(QrLoginStatus.EXPIRED);
                    qrLoginTokenRepository.save(token);
                }
            });
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String userIdStr = authentication.getPrincipal().toString();
        UUID userId = UUID.fromString(userIdStr);

        // Resolve GeoIP OUTSIDE of the transaction
        GeoIpResolution geo = geoIpLookupService.resolve(qrToken.getIpAddress());

        transactionTemplate.executeWithoutResult(status -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            ClientPlatform platform = ClientPlatform.WEB; // QR logins are usually for Web
            String deviceLabel = resolveDeviceLabel(null, qrToken.getUserAgent());

            StartLoginSessionResult sessionResult = userSessionService.startNewLoginSession(
                    user, platform, deviceLabel, qrToken.getUserAgent(), qrToken.getIpAddress(), geo);

            AuthResponse authResponse = buildTokenResponse(user, sessionResult.session().getId());

            QrLoginToken tokenToUpdate = qrLoginTokenRepository.findById(request.getToken())
                    .orElseThrow(() -> new AppException(ErrorCode.INVALID_TOKEN));
            tokenToUpdate.setStatus(QrLoginStatus.SUCCESS);
            try {
                tokenToUpdate.setAuthResponseData(objectMapper.writeValueAsString(authResponse));
                tokenToUpdate.setUserId(userId);
                qrLoginTokenRepository.save(tokenToUpdate);
            } catch (Exception e) {
                log.error("Failed to serialize auth response for QR token", e);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
        });
    }
}
