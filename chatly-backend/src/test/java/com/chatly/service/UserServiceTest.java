package com.chatly.service;

import com.chatly.dto.request.UserUpdateRequest;
import com.chatly.dto.response.UserResponse;
import com.chatly.mapper.UserMapper;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private ContactService contactService;

    @Mock
    private UserSettingsService userSettingsService;

    @InjectMocks
    private UserService userService;

    @Test
    void search_withKeyword_shouldReturnPagedUsers() {
        User user = buildUser(UUID.randomUUID(), "alice");
        UserResponse mapped = UserResponse.builder()
                .id(user.getId().toString())
                .username("alice")
                .build();
        PageRequest pageable = PageRequest.of(0, 10);

        when(userRepository.searchByKeyword("alice", pageable))
                .thenReturn(new PageImpl<>(List.of(user), pageable, 1));
        when(userMapper.toResponse(user)).thenReturn(mapped);
        when(userSettingsService.applyPresencePrivacy(mapped)).thenReturn(mapped);

        var result = userService.search(" alice ", 0, 10);

        assertThat(result.getItems()).containsExactly(mapped);
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(userRepository).searchByKeyword("alice", pageable);
    }

    @Test
    void update_validRequest_shouldSaveUpdatedProfile() {
        UUID userId = UUID.randomUUID();
        User user = buildUser(userId, "alice");
        UserUpdateRequest request = UserUpdateRequest.builder()
                .username("alice2")
                .email("alice2@example.com")
                .displayName("Alice Two")
                .avatarUrl("https://cdn.example.com/a.png")
                .phone("0911111111")
                .dob("2000-01-02")
                .bio("Updated bio")
                .build();
        UserResponse mapped = UserResponse.builder()
                .id(userId.toString())
                .username("alice2")
                .displayName("Alice Two")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(userMapper.toResponse(user)).thenReturn(mapped);
        when(userSettingsService.applyPresencePrivacy(mapped)).thenReturn(mapped);

        var result = userService.update(userId, request);

        assertThat(result.getUsername()).isEqualTo("alice2");
        assertThat(user.getDisplayName()).isEqualTo("Alice Two");
        assertThat(user.getDob()).isNotNull();
        verify(userRepository).save(user);
    }

    @Test
    void delete_existingUser_shouldDeleteById() {
        UUID userId = UUID.randomUUID();
        when(userRepository.existsById(userId)).thenReturn(true);

        userService.delete(userId);

        verify(userRepository).deleteById(userId);
    }

    private User buildUser(UUID id, String username) {
        return User.builder()
                .id(id)
                .username(username)
                .email(username + "@example.com")
                .phone("0900000000")
                .displayName(username)
                .password("hash")
                .build();
    }
}
