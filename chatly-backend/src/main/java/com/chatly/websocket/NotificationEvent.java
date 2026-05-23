package com.chatly.websocket;

import com.chatly.dto.response.NotificationResponse;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationEvent {

    private NotificationResponse notification;
    private long unreadCount;
}
