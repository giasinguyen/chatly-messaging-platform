package com.chatly.service;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.mapper.MessageMapper;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Conversation;
import com.chatly.model.mongo.LocationPayload;
import com.chatly.model.mongo.Message;
import com.chatly.repository.mongo.ConversationRepository;
import com.chatly.repository.mongo.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceLocationTest {

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

        @InjectMocks
        private MessageService messageService;

        private static final String SENDER_ID = "user-abc";
        private static final String CONVERSATION_ID = "conv-123";

        private Conversation conversation;

        @BeforeEach
        void setUp() {
                conversation = Conversation.builder()
                                .id(CONVERSATION_ID)
                                .type(ConversationType.GROUP)
                                .participantIds(List.of(SENDER_ID, "user-def"))
                                .build();
        }

        @Test
        void send_locationMessage_shouldPersistLocationPayload() {
                LocationPayload location = LocationPayload.builder()
                                .latitude(10.762622)
                                .longitude(106.660172)
                                .address("Ho Chi Minh City, Vietnam")
                                .mapSnapshotUrl(null)
                                .build();

                MessageRequest request = MessageRequest.builder()
                                .conversationId(CONVERSATION_ID)
                                .type(MessageType.LOCATION)
                                .location(location)
                                .build();

                Message savedMessage = Message.builder()
                                .id("msg-001")
                                .conversationId(CONVERSATION_ID)
                                .senderId(SENDER_ID)
                                .type(MessageType.LOCATION)
                                .location(location)
                                .build();

                MessageResponse expectedResponse = MessageResponse.builder()
                                .id("msg-001")
                                .conversationId(CONVERSATION_ID)
                                .type(MessageType.LOCATION)
                                .location(location)
                                .build();

                when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
                when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
                when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(Conversation.class)))
                                .thenReturn(null);
                when(messageMapper.toResponse(savedMessage)).thenReturn(expectedResponse);

                MessageResponse result = messageService.send(SENDER_ID, request);

                assertThat(result.getType()).isEqualTo(MessageType.LOCATION);
                assertThat(result.getLocation()).isNotNull();
                assertThat(result.getLocation().getLatitude()).isEqualTo(10.762622);
                assertThat(result.getLocation().getLongitude()).isEqualTo(106.660172);
                assertThat(result.getLocation().getAddress()).isEqualTo("Ho Chi Minh City, Vietnam");

                ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
                verify(messageRepository).save(captor.capture());
                assertThat(captor.getValue().getLocation()).isNotNull();
                assertThat(captor.getValue().getLocation().getLatitude()).isEqualTo(10.762622);
        }

        @Test
        void send_locationMessage_withoutParticipation_shouldThrow() {
                Conversation otherConversation = Conversation.builder()
                                .id(CONVERSATION_ID)
                                .type(ConversationType.GROUP)
                                .participantIds(List.of("user-xyz", "user-def"))
                                .build();

                MessageRequest request = MessageRequest.builder()
                                .conversationId(CONVERSATION_ID)
                                .type(MessageType.LOCATION)
                                .location(LocationPayload.builder().latitude(10.0).longitude(106.0).build())
                                .build();

                when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.of(otherConversation));

                assertThatThrownBy(() -> messageService.send(SENDER_ID, request))
                                .isInstanceOf(AppException.class)
                                .extracting("errorCode")
                                .isEqualTo(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        @Test
        void send_locationMessage_nullLocation_shouldSaveWithNullLocationField() {
                MessageRequest request = MessageRequest.builder()
                                .conversationId(CONVERSATION_ID)
                                .type(MessageType.LOCATION)
                                .location(null)
                                .build();

                Message savedMessage = Message.builder()
                                .id("msg-002")
                                .conversationId(CONVERSATION_ID)
                                .senderId(SENDER_ID)
                                .type(MessageType.LOCATION)
                                .location(null)
                                .build();

                MessageResponse expectedResponse = MessageResponse.builder()
                                .id("msg-002")
                                .type(MessageType.LOCATION)
                                .location(null)
                                .build();

                when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
                when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
                when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(Conversation.class)))
                                .thenReturn(null);
                when(messageMapper.toResponse(savedMessage)).thenReturn(expectedResponse);

                MessageResponse result = messageService.send(SENDER_ID, request);

                assertThat(result.getType()).isEqualTo(MessageType.LOCATION);
                assertThat(result.getLocation()).isNull();
        }
}
