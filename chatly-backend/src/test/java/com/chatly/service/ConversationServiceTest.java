package com.chatly.service;

import com.chatly.dto.request.ConversationRequest;
import com.chatly.dto.response.ConversationResponse;
import com.chatly.mapper.ConversationMapper;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.mongo.Conversation;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.NotificationRepository;
import com.chatly.repository.postgres.GroupMemberRepository;
import com.chatly.repository.postgres.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConversationServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConversationMapper conversationMapper;

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ConversationService conversationService;

    @Test
    void create_privateConversation_shouldAddCreatorSaveAndReturnResponse() {
        String creatorId = "11111111-1111-1111-1111-111111111111";
        String otherId = "22222222-2222-2222-2222-222222222222";
        Conversation saved = Conversation.builder()
                .id("conversation-1")
                .type(ConversationType.PRIVATE)
                .creatorId(creatorId)
                .participantIds(new ArrayList<>(List.of(otherId, creatorId)))
                .build();
        ConversationResponse response = ConversationResponse.builder()
                .id("conversation-1")
                .type(ConversationType.PRIVATE)
                .participantIds(List.of(otherId, creatorId))
                .build();

        when(conversationRepository.save(org.mockito.ArgumentMatchers.any(Conversation.class))).thenReturn(saved);
        when(conversationMapper.toResponse(saved)).thenReturn(response);

        var result = conversationService.create(creatorId, ConversationRequest.builder()
                .type(ConversationType.PRIVATE)
                .participantIds(List.of(otherId))
                .build());

        assertThat(result).isEqualTo(response);
        verify(conversationRepository).save(org.mockito.ArgumentMatchers.argThat(conversation ->
                conversation.getParticipantIds().containsAll(List.of(creatorId, otherId))));
    }

    @Test
    void getById_whenParticipant_shouldReturnConversationWithUnreadCount() {
        String userId = "11111111-1111-1111-1111-111111111111";
        Conversation conversation = Conversation.builder()
                .id("conversation-1")
                .type(ConversationType.PRIVATE)
                .participantIds(List.of(userId, "22222222-2222-2222-2222-222222222222"))
                .build();
        ConversationResponse response = ConversationResponse.builder()
                .id("conversation-1")
                .participantIds(conversation.getParticipantIds())
                .build();

        when(conversationRepository.findById("conversation-1")).thenReturn(Optional.of(conversation));
        when(conversationMapper.toResponse(conversation)).thenReturn(response);
        when(notificationRepository.countByReceiverIdAndTypeAndReferenceIdAndReadFalse(
                org.mockito.ArgumentMatchers.eq(userId),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("conversation-1"))).thenReturn(3L);

        var result = conversationService.getById("conversation-1", userId);

        assertThat(result.getUnreadCount()).isEqualTo(3);
    }

    @Test
    void delete_whenParticipant_shouldSoftDeleteConversationForUser() {
        String userId = "11111111-1111-1111-1111-111111111111";
        Conversation conversation = Conversation.builder()
                .id("conversation-1")
                .participantIds(List.of(userId, "22222222-2222-2222-2222-222222222222"))
                .deletedBy(new HashSet<>())
                .build();

        when(conversationRepository.findById("conversation-1")).thenReturn(Optional.of(conversation));

        conversationService.delete("conversation-1", userId);

        assertThat(conversation.getDeletedBy()).contains(userId);
        verify(conversationRepository).save(conversation);
    }
}
