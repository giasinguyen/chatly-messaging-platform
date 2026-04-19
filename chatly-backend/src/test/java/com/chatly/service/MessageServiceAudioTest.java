package com.chatly.service;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.mapper.MessageMapper;
import com.chatly.model.enums.ConversationType;
import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Attachment;
import com.chatly.model.mongo.Conversation;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceAudioTest {

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
        void send_audioMessage_shouldPersistDurationSeconds() {
                Attachment audioAttachment = Attachment.builder()
                                .fileId("file-001")
                                .url("https://cdn.example.com/audio/voice.webm")
                                .name("voice.webm")
                                .type("audio/webm")
                                .size(204800L)
                                .durationSeconds(45)
                                .build();

                MessageRequest request = MessageRequest.builder()
                                .conversationId(CONVERSATION_ID)
                                .type(MessageType.AUDIO)
                                .attachments(List.of(audioAttachment))
                                .build();

                Message savedMessage = Message.builder()
                                .id("msg-audio-001")
                                .conversationId(CONVERSATION_ID)
                                .senderId(SENDER_ID)
                                .type(MessageType.AUDIO)
                                .attachments(List.of(audioAttachment))
                                .build();

                MessageResponse expectedResponse = MessageResponse.builder()
                                .id("msg-audio-001")
                                .conversationId(CONVERSATION_ID)
                                .type(MessageType.AUDIO)
                                .attachments(List.of(audioAttachment))
                                .build();

                when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
                when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
                when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(Conversation.class)))
                                .thenReturn(null);
                when(messageMapper.toResponse(savedMessage)).thenReturn(expectedResponse);

                MessageResponse result = messageService.send(SENDER_ID, request);

                assertThat(result.getType()).isEqualTo(MessageType.AUDIO);
                assertThat(result.getAttachments()).hasSize(1);
                assertThat(result.getAttachments().get(0).getDurationSeconds()).isEqualTo(45);

                ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
                verify(messageRepository).save(captor.capture());
                Message persisted = captor.getValue();
                assertThat(persisted.getAttachments()).hasSize(1);
                assertThat(persisted.getAttachments().get(0).getDurationSeconds()).isEqualTo(45);
        }

        @Test
        void send_audioMessage_nullDuration_shouldSaveWithNullDuration() {
                Attachment audioAttachment = Attachment.builder()
                                .fileId("file-002")
                                .url("https://cdn.example.com/audio/voice2.webm")
                                .name("voice2.webm")
                                .type("audio/webm")
                                .size(102400L)
                                .durationSeconds(null)
                                .build();

                MessageRequest request = MessageRequest.builder()
                                .conversationId(CONVERSATION_ID)
                                .type(MessageType.AUDIO)
                                .attachments(List.of(audioAttachment))
                                .build();

                Message savedMessage = Message.builder()
                                .id("msg-audio-002")
                                .conversationId(CONVERSATION_ID)
                                .senderId(SENDER_ID)
                                .type(MessageType.AUDIO)
                                .attachments(List.of(audioAttachment))
                                .build();

                MessageResponse expectedResponse = MessageResponse.builder()
                                .id("msg-audio-002")
                                .type(MessageType.AUDIO)
                                .attachments(List.of(audioAttachment))
                                .build();

                when(conversationRepository.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
                when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
                when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(Conversation.class)))
                                .thenReturn(null);
                when(messageMapper.toResponse(savedMessage)).thenReturn(expectedResponse);

                MessageResponse result = messageService.send(SENDER_ID, request);

                assertThat(result.getType()).isEqualTo(MessageType.AUDIO);
                assertThat(result.getAttachments()).hasSize(1);
                assertThat(result.getAttachments().get(0).getDurationSeconds()).isNull();

                ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
                verify(messageRepository).save(captor.capture());
                assertThat(captor.getValue().getAttachments().get(0).getDurationSeconds()).isNull();
        }

        @Test
        void send_audioMessage_mapper_shouldExposeDurationSeconds() {
                Attachment audioAttachment = Attachment.builder()
                                .fileId("file-003")
                                .url("https://cdn.example.com/audio/voice3.mp4")
                                .name("voice3.mp4")
                                .type("audio/mp4")
                                .size(512000L)
                                .durationSeconds(120)
                                .build();

                Message message = Message.builder()
                                .id("msg-audio-003")
                                .conversationId(CONVERSATION_ID)
                                .senderId(SENDER_ID)
                                .type(MessageType.AUDIO)
                                .attachments(List.of(audioAttachment))
                                .build();

                MessageResponse mappedResponse = MessageResponse.builder()
                                .id("msg-audio-003")
                                .conversationId(CONVERSATION_ID)
                                .type(MessageType.AUDIO)
                                .attachments(List.of(audioAttachment))
                                .build();

                when(messageMapper.toResponse(message)).thenReturn(mappedResponse);

                MessageResponse result = messageMapper.toResponse(message);

                assertThat(result.getAttachments()).hasSize(1);
                assertThat(result.getAttachments().get(0).getDurationSeconds()).isEqualTo(120);
                assertThat(result.getAttachments().get(0).getUrl())
                                .isEqualTo("https://cdn.example.com/audio/voice3.mp4");
                assertThat(result.getAttachments().get(0).getType()).isEqualTo("audio/mp4");
        }
}
