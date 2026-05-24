package com.chatly.service;

import com.chatly.config.AgoraProperties;
import com.chatly.dto.request.AgoraTokenRequest;
import com.chatly.dto.response.AgoraTokenResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.model.mongo.Conversation;
import com.chatly.repository.mongo.ConversationRepository;
import io.agora.media.RtcTokenBuilder2;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.zip.CRC32;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgoraTokenService {

    private static final String CHANNEL_PREFIX = "chatly_call_";
    private static final int MIN_UID = 1;

    private final ConversationRepository conversationRepository;
    private final AgoraProperties agoraProperties;

    public AgoraTokenResponse createToken(String userId, AgoraTokenRequest request) {
        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getParticipantIds().contains(userId)) {
            throw new AppException(ErrorCode.NOT_CONVERSATION_PARTICIPANT);
        }

        String appId = requireAppId();
        String channelName = buildChannelName(request.getCallId());
        int uid = buildUid(userId);
        String token = buildToken(appId, channelName, uid);

        return AgoraTokenResponse.builder()
                .appId(appId)
                .channelName(channelName)
                .uid(uid)
                .token(token)
                .expiresInSeconds(agoraProperties.getTokenTtlSeconds())
                .build();
    }

    private String requireAppId() {
        String appId = agoraProperties.getAppId();
        if (appId == null || appId.isBlank()) {
            throw new AppException(ErrorCode.AGORA_NOT_CONFIGURED);
        }
        return appId;
    }

    private String buildToken(String appId, String channelName, int uid) {
        String appCertificate = agoraProperties.getAppCertificate();
        if (appCertificate == null || appCertificate.isBlank()) {
            return null;
        }

        RtcTokenBuilder2 tokenBuilder = new RtcTokenBuilder2();
        return tokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                channelName,
                uid,
                RtcTokenBuilder2.Role.ROLE_PUBLISHER,
                agoraProperties.getTokenTtlSeconds(),
                agoraProperties.getTokenTtlSeconds()
        );
    }

    private String buildChannelName(String callId) {
        return CHANNEL_PREFIX + callId.replaceAll("[^A-Za-z0-9_\\-]", "_");
    }

    private int buildUid(String userId) {
        CRC32 crc32 = new CRC32();
        crc32.update(userId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return (int) (crc32.getValue() % Integer.MAX_VALUE) + MIN_UID;
    }
}
