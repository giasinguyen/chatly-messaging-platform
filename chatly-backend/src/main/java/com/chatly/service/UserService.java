package com.chatly.service;

import com.chatly.dto.request.UserUpdateRequest;
import com.chatly.dto.response.PagedResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.UserMapper;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String userId = authentication.getPrincipal().toString();
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return userMapper.toResponse(user);
    }

    public UserResponse getById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return userMapper.toResponse(user);
    }

    public UserResponse getByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return userMapper.toResponse(user);
    }

    public List<UserResponse> getAll() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponse)
                .toList();
    }

    public PagedResponse<UserResponse> search(String keyword, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<UserResponse> userPage;

        if (keyword == null || keyword.isBlank()) {
            userPage = userRepository.findAll(pageable).map(userMapper::toResponse);
        } else {
            userPage = userRepository.searchByKeyword(keyword.trim(), pageable)
                    .map(userMapper::toResponse);
        }

        return PagedResponse.from(userPage);
    }

    @Transactional
    public UserResponse update(UUID id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getUsername() != null) {
            if (userRepository.existsByUsername(request.getUsername())
                    && !request.getUsername().equals(user.getUsername())) {
                throw new AppException(ErrorCode.USERNAME_ALREADY_EXISTS);
            }
            user.setUsername(request.getUsername());
        }
        if (request.getEmail() != null) {
            if (userRepository.existsByEmail(request.getEmail()) && !request.getEmail().equals(user.getEmail())) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setEmail(request.getEmail());
        }
        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getPhone() != null) {
            if (userRepository.existsByPhone(request.getPhone()) && !request.getPhone().equals(user.getPhone())) {
                throw new AppException(ErrorCode.PHONE_ALREADY_EXISTS);
            }
            user.setPhone(request.getPhone());
        }
        if (request.getDob() != null) {
            user.setDob(request.getDob());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }

        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public void delete(UUID id) {
        if (!userRepository.existsById(id)) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        userRepository.deleteById(id);
    }
}
