package com.chatly.dto.response;

import com.chatly.model.enums.NotificationType;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private String id;
    private NotificationType type;
    private String senderId;
    private String receiverId;
    private String referenceId;
    private String content;
    private boolean read;
    private Instant createdAt;
}
