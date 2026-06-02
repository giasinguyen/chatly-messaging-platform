package com.chatly.service;

import com.chatly.dto.request.ChangePasswordRequest;
import com.chatly.dto.request.ForgotPasswordRequest;
import com.chatly.dto.request.LoginRequest;
import com.chatly.dto.request.RegisterRequest;
import com.chatly.dto.response.UserResponse;
import com.chatly.dto.session.StartLoginSessionResult;
import com.chatly.mapper.UserMapper;
import com.chatly.model.enums.ClientPlatform;
import com.chatly.model.postgres.User;
import com.chatly.model.postgres.UserLoginSession;
import com.chatly.repository.postgres.EmailVerificationOtpRepository;
import com.chatly.repository.postgres.QrLoginTokenRepository;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.security.JwtProvider;
import com.chatly.security.PasswordChangeTokenValidator;
import com.chatly.security.SessionTokenValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private UserMapper userMapper;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private EmailVerificationOtpRepository emailVerificationOtpRepository;

    @Mock
    private EmailVerificationMailService emailVerificationMailService;

    @Mock
    private PasswordChangeTokenValidator passwordChangeTokenValidator;

    @Mock
    private SessionTokenValidator sessionTokenValidator;

    @Mock
    private UserSessionService userSessionService;

    @Mock
    private GeoIpLookupService geoIpLookupService;

    @Mock
    private AsyncNotificationService asyncNotificationService;

    @Mock
    private TransactionTemplate transactionTemplate;

    @Mock
    private QrLoginTokenRepository qrLoginTokenRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AuthService authService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void register_validRequest_shouldSaveUserAndSendVerificationLink() {
        UUID userId = UUID.randomUUID();
        RegisterRequest request = RegisterRequest.builder()
                .username("newuser")
                .email("newuser@example.com")
                .phone("0900000000")
                .displayName("New User")
                .password("secret123")
                .build();
        User savedUser = User.builder()
                .id(userId)
                .username("newuser")
                .email("newuser@example.com")
                .displayName("New User")
                .password("encoded-password")
                .emailVerified(false)
                .build();

        when(passwordEncoder.encode("secret123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        var result = authService.register(request);

        assertThat(result.getUserId()).isEqualTo(userId.toString());
        verify(userRepository).save(any(User.class));
        verify(emailVerificationOtpRepository).markAllUnusedAsUsed(userId);
        verify(emailVerificationOtpRepository).save(any());
        verify(emailVerificationMailService).sendVerificationLink(eq(savedUser), anyString());
    }

    @Test
    void login_validCredentials_shouldReturnTokens() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .username("newuser")
                .email("newuser@example.com")
                .password("encoded-password")
                .displayName("New User")
                .emailVerified(true)
                .build();
        UserLoginSession session = UserLoginSession.builder()
                .id(sessionId)
                .userId(userId)
                .platform(ClientPlatform.WEB)
                .build();
        HttpServletRequest httpRequest = mock(HttpServletRequest.class);
        UserResponse userResponse = UserResponse.builder()
                .id(userId.toString())
                .username("newuser")
                .build();

        when(userRepository.findByLoginIdentifier("newuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "encoded-password")).thenReturn(true);
        when(httpRequest.getHeader("X-Client-Platform")).thenReturn("WEB");
        when(httpRequest.getHeader("X-Device-Label")).thenReturn("JUnit device");
        when(httpRequest.getHeader("User-Agent")).thenReturn("JUnit");
        when(geoIpLookupService.resolve(any())).thenReturn(null);
        when(userSessionService.startNewLoginSession(eq(user), eq(ClientPlatform.WEB), any(), any(), any(), any()))
                .thenReturn(new StartLoginSessionResult(session, null));
        when(jwtProvider.generateAccessToken(userId.toString(), sessionId.toString(), "USER"))
                .thenReturn("access-token");
        when(jwtProvider.generateRefreshToken(userId.toString(), sessionId.toString(), "USER"))
                .thenReturn("refresh-token");
        when(userMapper.toResponse(user)).thenReturn(userResponse);

        var result = authService.login(LoginRequest.builder()
                .identifier(" newuser ")
                .password(" secret123 ")
                .build(), httpRequest);

        assertThat(result.getToken()).isEqualTo("access-token");
        assertThat(result.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(result.getSessionId()).isEqualTo(sessionId.toString());
        assertThat(result.getUser()).isEqualTo(userResponse);
    }

    @Test
    void changePassword_validRequest_shouldUpdatePasswordAndRevokeSessions() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("newuser@example.com")
                .password("old-hash")
                .displayName("New User")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken(userId.toString(), null, List.of()));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldSecret", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("newSecret")).thenReturn("new-hash");

        authService.changePassword(ChangePasswordRequest.builder()
                .currentPassword("oldSecret")
                .newPassword("newSecret")
                .confirmPassword("newSecret")
                .build());

        assertThat(user.getPassword()).isEqualTo("new-hash");
        assertThat(user.getPasswordChangedAt()).isNotNull();
        verify(userRepository).saveAndFlush(user);
        verify(userSessionService).revokeAllForUser(userId);
        verify(asyncNotificationService).sendPasswordChangedNoticeAsync(eq(user), any(Instant.class));
    }

    @Test
    void forgotPassword_existingEmail_shouldPersistNewPasswordAndSendAfterCommit() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("newuser@example.com")
                .password("old-hash")
                .displayName("New User")
                .build();

        when(userRepository.findByEmailIgnoreCase("newuser@example.com")).thenReturn(Optional.of(user));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(anyString())).thenReturn("reset-hash");
        when(passwordEncoder.matches(anyString(), eq("reset-hash"))).thenReturn(true);
        org.mockito.Mockito.doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            Consumer<Object> callback = invocation.getArgument(0, Consumer.class);
            TransactionSynchronizationManager.initSynchronization();
            try {
                callback.accept(null);
                for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
                    synchronization.afterCommit();
                }
            } finally {
                TransactionSynchronizationManager.clearSynchronization();
            }
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        authService.forgotPassword(ForgotPasswordRequest.builder()
                .email("newuser@example.com")
                .build());

        assertThat(user.getPassword()).isEqualTo("reset-hash");
        verify(userRepository).saveAndFlush(user);
        verify(userSessionService).revokeAllForUser(userId);
        verify(emailVerificationMailService).sendNewPassword(eq(user), anyString());
    }
}
