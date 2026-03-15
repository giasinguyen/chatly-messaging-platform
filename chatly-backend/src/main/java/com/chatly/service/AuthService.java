package com.chatly.service;

import com.chatly.dto.request.LoginRequest;
import com.chatly.dto.request.LogoutRequest;
import com.chatly.dto.request.RefreshTokenRequest;
import com.chatly.dto.request.RegisterRequest;
import com.chatly.dto.request.IntrospectRequest;
import com.chatly.dto.response.AuthResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.dto.response.IntrospectResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.UserMapper;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.UserRepository;
import com.chatly.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final UserMapper userMapper;
    private final TokenBlacklistService tokenBlacklistService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USERNAME_ALREADY_EXISTS);
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
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
            .build();

        user = userRepository.save(user);

        String token = jwtProvider.generateToken(user.getId().toString());
        String refreshToken = jwtProvider.generateRefreshToken(user.getId().toString());
        UserResponse userResponse = userMapper.toResponse(user);

        return AuthResponse.builder()
            .token(token)
            .refreshToken(refreshToken)
            .user(userResponse)
            .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameOrEmailOrPhone(
                request.getIdentifier(), request.getIdentifier(), request.getIdentifier())
            .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        String token = jwtProvider.generateToken(user.getId().toString());
        String refreshToken = jwtProvider.generateRefreshToken(user.getId().toString());
        UserResponse userResponse = userMapper.toResponse(user);

        return AuthResponse.builder()
            .token(token)
            .refreshToken(refreshToken)
            .user(userResponse)
            .build();
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

        String newToken = jwtProvider.generateToken(user.getId().toString());
        String newRefreshToken = jwtProvider.generateRefreshToken(user.getId().toString());
        UserResponse userResponse = userMapper.toResponse(user);

        return AuthResponse.builder()
            .token(newToken)
            .refreshToken(newRefreshToken)
            .user(userResponse)
            .build();
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
}
