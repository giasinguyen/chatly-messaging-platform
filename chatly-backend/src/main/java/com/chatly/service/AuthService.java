package com.chatly.service;

import com.chatly.dto.request.LoginRequest;
import com.chatly.dto.request.RefreshTokenRequest;
import com.chatly.dto.request.RegisterRequest;
import com.chatly.dto.response.AuthResponse;
import com.chatly.dto.response.UserResponse;
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

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(request.getEmail())
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
        User user = userRepository.findByEmail(request.getEmail())
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
        if (!jwtProvider.validateToken(request.getRefreshToken())) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        String userId = jwtProvider.getUserIdFromToken(request.getRefreshToken());
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
}
