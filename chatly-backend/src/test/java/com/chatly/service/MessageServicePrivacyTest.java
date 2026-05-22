package com.chatly.service;

import com.chatly.mapper.MessageMapper;
import com.chatly.model.mongo.Message;
import com.chatly.repository.mongo.MessageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServicePrivacyTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private MessageMapper messageMapper;

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private UserSettingsService userSettingsService;

    @InjectMocks
    private MessageService messageService;

    @Test
    void markAsSeen_shouldSkipReceiptWhenReaderHidesSeenStatus() {
        Message message = Message.builder()
                .id("message-id")
                .conversationId("conversation-id")
                .senderId("sender-id")
                .build();

        when(messageRepository.findById("message-id")).thenReturn(Optional.of(message));
        when(userSettingsService.isReadReceiptVisible("reader-id")).thenReturn(false);

        var result = messageService.markAsSeen("message-id", "reader-id");

        assertThat(result).isEmpty();
        verifyNoInteractions(messageMapper, mongoTemplate);
    }
}
