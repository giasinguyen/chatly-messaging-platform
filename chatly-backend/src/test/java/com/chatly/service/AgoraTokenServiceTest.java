package com.chatly.service;

import com.chatly.config.AgoraProperties;
import com.chatly.dto.request.AgoraTokenRequest;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.model.mongo.Conversation;
import com.chatly.repository.mongo.ConversationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgoraTokenServiceTest {

    private static final String USER_ID = "550e8400-e29b-41d4-a716-446655440001";
    private static final String OTHER_USER_ID = "550e8400-e29b-41d4-a716-446655440002";
    private static final String CONVERSATION_ID = "conversation-1";
    private static final String CALL_ID = "call_123";
    private static final String APP_ID = "test-agora-app-id";

    @Mock
    private ConversationRepository conversationRepository;

    private AgoraProperties agoraProperties;
    private AgoraTokenService agoraTokenService;

    @BeforeEach
    void setUp() {
        agoraProperties = new AgoraProperties();
        agoraProperties.setAppId(APP_ID);
        agoraProperties.setTokenTtlSeconds(3600);
        agoraTokenService = new AgoraTokenService(conversationRepository, agoraProperties);
    }

    @Test
    void createToken_shouldReturnTokenlessResponse_whenCertificateIsMissing() {
        when(conversationRepository.findById(CONVERSATION_ID))
                .thenReturn(Optional.of(conversationWithParticipants(USER_ID, OTHER_USER_ID)));

        var response = agoraTokenService.createToken(USER_ID, request());

        assertThat(response.getAppId()).isEqualTo(APP_ID);
        assertThat(response.getChannelName()).isEqualTo("chatly_call_" + CALL_ID);
        assertThat(response.getUid()).isPositive();
        assertThat(response.getToken()).isNull();
        assertThat(response.getExpiresInSeconds()).isEqualTo(3600);
    }

    @Test
    void createToken_shouldThrowForbidden_whenUserIsNotParticipant() {
        when(conversationRepository.findById(CONVERSATION_ID))
                .thenReturn(Optional.of(conversationWithParticipants(OTHER_USER_ID)));

        assertThatThrownBy(() -> agoraTokenService.createToken(USER_ID, request()))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
    }

    @Test
    void createToken_shouldThrowServiceUnavailable_whenAppIdIsMissing() {
        agoraProperties.setAppId("");
        when(conversationRepository.findById(CONVERSATION_ID))
                .thenReturn(Optional.of(conversationWithParticipants(USER_ID)));

        assertThatThrownBy(() -> agoraTokenService.createToken(USER_ID, request()))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.AGORA_NOT_CONFIGURED);
    }

    private AgoraTokenRequest request() {
        return AgoraTokenRequest.builder()
                .conversationId(CONVERSATION_ID)
                .callId(CALL_ID)
                .build();
    }

    private Conversation conversationWithParticipants(String... participantIds) {
        return Conversation.builder()
                .id(CONVERSATION_ID)
                .participantIds(List.of(participantIds))
                .build();
    }
}
