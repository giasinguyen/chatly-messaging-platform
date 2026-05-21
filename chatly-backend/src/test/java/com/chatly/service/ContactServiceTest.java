package com.chatly.service;

import com.chatly.mapper.ContactMapper;
import com.chatly.model.enums.ContactStatus;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContactServiceTest {

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ContactMapper contactMapper;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ContactService contactService;

    @Test
    void getFriendCount_shouldCountAcceptedContactsForEitherParticipant() {
        UUID userId = UUID.randomUUID();
        when(contactRepository.countByParticipantIdAndStatus(
                userId, ContactStatus.ACCEPTED)).thenReturn(4L);

        long result = contactService.getFriendCount(userId);

        assertThat(result).isEqualTo(4L);
        verify(contactRepository).countByParticipantIdAndStatus(
                userId, ContactStatus.ACCEPTED);
    }
}
