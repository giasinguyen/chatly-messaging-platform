package com.chatly.service;

import com.chatly.dto.response.PresenceResponse;
import com.chatly.model.enums.UserStatus;
import com.chatly.model.mongo.PrivacySettings;
import com.chatly.model.mongo.UserSettings;
import com.chatly.model.postgres.User;
import com.chatly.repository.mongo.UserSettingsRepository;
import com.chatly.repository.postgres.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PresenceServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserSettingsRepository userSettingsRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private PresenceService presenceService;

    @Test
    void broadcastCurrentPresence_shouldHideStatusAndLastSeenWhenDisabled() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .status(UserStatus.ONLINE)
                .lastSeen(Instant.parse("2026-05-22T10:00:00Z"))
                .build();
        UserSettings settings = UserSettings.builder()
                .userId(userId.toString())
                .privacy(PrivacySettings.builder()
                        .showOnlineStatus(false)
                        .showLastSeen(false)
                        .build())
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userSettingsRepository.findByUserId(userId.toString()))
                .thenReturn(Optional.of(settings));

        presenceService.broadcastCurrentPresence(userId.toString());

        ArgumentCaptor<PresenceResponse> presenceCaptor =
                ArgumentCaptor.forClass(PresenceResponse.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/presence"),
                presenceCaptor.capture()
        );
        assertThat(presenceCaptor.getValue().getUserId()).isEqualTo(userId.toString());
        assertThat(presenceCaptor.getValue().getStatus()).isEqualTo(UserStatus.OFFLINE);
        assertThat(presenceCaptor.getValue().getLastSeen()).isNull();
    }
}
