package com.chatly.service;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.mapper.MessageMapper;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Conversation;
import com.chatly.model.mongo.Message;
import com.chatly.proxy.AgentProxyClient;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.MessageRepository;
import com.chatly.repository.postgres.UserRepository;
import com.mongodb.client.result.UpdateResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    private static final String CONVERSATION_ID = "conversation-1";
    private static final String SENDER_ID = "11111111-1111-1111-1111-111111111111";
    private static final String OTHER_ID = "22222222-2222-2222-2222-222222222222";

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageMapper messageMapper;

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ContactService contactService;

    @Mock
    private UserSettingsService userSettingsService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AgentProxyClient agentProxyClient;

    @Mock
    private TaskScheduler taskScheduler;

    @InjectMocks
    private MessageService messageService;

    @Test
    void send_validTextMessage_shouldPersistDefaultsAndBroadcast() {
        Conversation conversation = privateConversation();
        Message saved = Message.builder()
                .id("message-1")
                .conversationId(CONVERSATION_ID)
                .senderId(SENDER_ID)
                .content("Hello")
                .type(MessageType.TEXT)
                .build();
        MessageResponse response = MessageResponse.builder()
                .id("message-1")
                .conversationId(CONVERSATION_ID)
                .senderId(SENDER_ID)
                .type(MessageType.TEXT)
                .build();

        when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(contactService.isBlocked(UUID.fromString(SENDER_ID), UUID.fromString(OTHER_ID))).thenReturn(false);
        when(userRepository.findById(UUID.fromString(OTHER_ID))).thenReturn(Optional.empty());
        when(messageRepository.save(any(Message.class))).thenReturn(saved);
        when(messageMapper.toResponse(saved)).thenReturn(response);

        var result = messageService.send(SENDER_ID, MessageRequest.builder()
                .conversationId(CONVERSATION_ID)
                .content("Hello")
                .type(null)
                .attachments(null)
                .mentions(null)
                .build());

        assertThat(result).isEqualTo(response);
        verify(messageRepository).save(org.mockito.ArgumentMatchers.argThat(message ->
                message.getType() == MessageType.TEXT
                        && message.getAttachments().isEmpty()
                        && message.getMentions().isEmpty()));
        verify(notificationService).createAndPush(any(), eq(SENDER_ID), eq(OTHER_ID), eq("Hello"), eq(CONVERSATION_ID));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversation." + CONVERSATION_ID), any(Object.class));
    }

    @Test
    void recall_ownedMessage_shouldMarkRecalledAndBroadcast() {
        Message message = Message.builder()
                .id("message-1")
                .conversationId(CONVERSATION_ID)
                .senderId(SENDER_ID)
                .type(MessageType.TEXT)
                .createdAt(Instant.now())
                .build();
        MessageResponse response = MessageResponse.builder()
                .id("message-1")
                .recalled(true)
                .build();

        when(messageRepository.findById("message-1")).thenReturn(Optional.of(message));
        when(mongoTemplate.updateFirst(any(), any(), eq(Message.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));
        when(messageMapper.toResponse(message)).thenReturn(response);

        var result = messageService.recall("message-1", SENDER_ID);

        assertThat(result).isEqualTo(response);
        assertThat(message.isRecalled()).isTrue();
        assertThat(message.getRecalledBy()).isEqualTo(SENDER_ID);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversation." + CONVERSATION_ID), any(Object.class));
    }

    @Test
    void edit_textMessageWithinLimit_shouldUpdateContentAndBroadcast() {
        Message message = Message.builder()
                .id("message-1")
                .conversationId(CONVERSATION_ID)
                .senderId(SENDER_ID)
                .content("Old")
                .type(MessageType.TEXT)
                .createdAt(Instant.now())
                .build();
        MessageResponse response = MessageResponse.builder()
                .id("message-1")
                .content("New")
                .edited(true)
                .build();

        when(messageRepository.findById("message-1")).thenReturn(Optional.of(message));
        when(mongoTemplate.updateFirst(any(), any(), eq(Message.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));
        when(messageMapper.toResponse(message)).thenReturn(response);

        var result = messageService.edit("message-1", SENDER_ID, "New");

        assertThat(result).isEqualTo(response);
        assertThat(message.getContent()).isEqualTo("New");
        assertThat(message.isEdited()).isTrue();
        assertThat(message.getEditHistory()).hasSize(1);
    }

    @Test
    void delete_ownedMessage_shouldDeleteAndBroadcast() {
        Message message = Message.builder()
                .id("message-1")
                .conversationId(CONVERSATION_ID)
                .senderId(SENDER_ID)
                .type(MessageType.TEXT)
                .build();
        MessageResponse response = MessageResponse.builder().id("message-1").build();

        when(messageRepository.findById("message-1")).thenReturn(Optional.of(message));
        when(messageMapper.toResponse(message)).thenReturn(response);

        messageService.delete("message-1", SENDER_ID);

        verify(messageRepository).deleteById("message-1");
        verify(messagingTemplate).convertAndSend(eq("/topic/conversation." + CONVERSATION_ID), any(Object.class));
    }

    @Test
    void search_whenParticipant_shouldReturnMappedMessages() {
        Conversation conversation = privateConversation();
        Message message = Message.builder()
                .id("message-1")
                .conversationId(CONVERSATION_ID)
                .senderId(SENDER_ID)
                .content("Need help")
                .type(MessageType.TEXT)
                .build();
        MessageResponse response = MessageResponse.builder()
                .id("message-1")
                .content("Need help")
                .build();

        when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(mongoTemplate.find(any(), eq(Message.class))).thenReturn(List.of(message));
        when(messageMapper.toResponse(message)).thenReturn(response);

        var result = messageService.search(CONVERSATION_ID, SENDER_ID, "help", 0, 10);

        assertThat(result).containsExactly(response);
        verify(mongoTemplate).find(any(), eq(Message.class));
    }

    private Conversation privateConversation() {
        return Conversation.builder()
                .id(CONVERSATION_ID)
                .type(ConversationType.PRIVATE)
                .participantIds(List.of(SENDER_ID, OTHER_ID))
                .build();
    }
}
