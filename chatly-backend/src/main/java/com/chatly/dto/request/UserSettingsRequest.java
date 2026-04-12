package com.chatly.dto.request;

import com.chatly.model.mongo.MessageSettings;
import com.chatly.model.mongo.NotificationSettings;
import com.chatly.model.mongo.PrivacySettings;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettingsRequest {

    private PrivacySettings privacy;
    private NotificationSettings notifications;
    private MessageSettings messages;
}
