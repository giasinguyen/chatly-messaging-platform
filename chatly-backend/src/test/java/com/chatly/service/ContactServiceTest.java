package com.chatly.service;

import com.chatly.dto.request.ContactRequest;
import com.chatly.dto.response.ContactResponse;
import com.chatly.dto.response.ContactSuggestionResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.ContactMapper;
import com.chatly.mapper.ContactSuggestionMapper;
import com.chatly.model.enums.ContactStatus;
import com.chatly.model.enums.NotificationType;
import com.chatly.model.postgres.Contact;
import com.chatly.model.postgres.User;
import com.chatly.repository.postgres.ContactRepository;
import com.chatly.repository.postgres.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
    private ContactSuggestionMapper contactSuggestionMapper;

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserSettingsService userSettingsService;

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

    @Test
    void getSuggestions_shouldReturnUsersWithMutualFriends() {
        UUID userId = UUID.randomUUID();
        User currentUser = buildUser(userId, "me");
        User friend = buildUser(UUID.randomUUID(), "friend");
        User candidate = buildUser(UUID.randomUUID(), "candidate");
        Contact directFriend = acceptedContact(currentUser, friend);
        Contact friendOfFriend = acceptedContact(friend, candidate);
        ContactSuggestionResponse candidateResponse = ContactSuggestionResponse.builder()
                .id(candidate.getId().toString())
                .username(candidate.getUsername())
                .displayName(candidate.getDisplayName())
                .mutualFriendCount(1)
                .build();

        when(contactRepository.findByParticipantIdAndStatus(userId, ContactStatus.ACCEPTED))
                .thenReturn(List.of(directFriend));
        when(contactRepository.findByUserIdOrContactId(userId, userId))
                .thenReturn(List.of(directFriend));
        when(contactRepository.findByParticipantIdAndStatus(friend.getId(), ContactStatus.ACCEPTED))
                .thenReturn(List.of(directFriend, friendOfFriend));
        when(userRepository.findAllById(List.of(candidate.getId()))).thenReturn(List.of(candidate));
        when(contactSuggestionMapper.toResponse(candidate, 1)).thenReturn(candidateResponse);

        var result = contactService.getSuggestions(userId, 5);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst()).isEqualTo(candidateResponse);
        assertThat(result.getFirst().getMutualFriendCount()).isEqualTo(1);
    }

    @Test
    void acceptRequest_shouldNotifyRequestSender() {
        User requester = buildUser(UUID.randomUUID(), "requester");
        User accepter = buildUser(UUID.randomUUID(), "accepter");
        UUID contactId = UUID.randomUUID();
        Contact pendingContact = Contact.builder()
                .id(contactId)
                .user(requester)
                .contact(accepter)
                .status(ContactStatus.PENDING)
                .build();

        when(contactRepository.findById(contactId)).thenReturn(Optional.of(pendingContact));
        when(contactRepository.save(pendingContact)).thenReturn(pendingContact);
        when(contactMapper.toResponse(pendingContact)).thenReturn(ContactResponse.builder().build());

        contactService.acceptRequest(contactId);

        verify(notificationService).createAndPush(
                NotificationType.FRIEND_ACCEPTED,
                accepter.getId().toString(),
                requester.getId().toString(),
                "accepter accepted your friend request",
                accepter.getId().toString()
        );
    }

    @Test
    void sendRequest_shouldRejectWhenTargetDisablesFriendRequests() {
        User requester = buildUser(UUID.randomUUID(), "requester");
        User target = buildUser(UUID.randomUUID(), "target");
        ContactRequest request = ContactRequest.builder()
                .contactId(target.getId().toString())
                .build();

        when(userRepository.findById(requester.getId())).thenReturn(Optional.of(requester));
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(userSettingsService.isFriendRequestAllowed(target.getId().toString()))
                .thenReturn(false);

        assertThatThrownBy(() -> contactService.sendRequest(requester.getId(), request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CONTACT_FRIEND_REQUESTS_DISABLED);
    }

    private User buildUser(UUID id, String username) {
        return User.builder()
                .id(id)
                .username(username)
                .displayName(username)
                .build();
    }

    private Contact acceptedContact(User user, User contact) {
        return Contact.builder()
                .user(user)
                .contact(contact)
                .status(ContactStatus.ACCEPTED)
                .build();
    }
}
