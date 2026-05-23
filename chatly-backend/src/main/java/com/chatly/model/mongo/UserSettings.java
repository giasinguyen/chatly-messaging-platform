package com.chatly.model.mongo;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "user_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettings {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Builder.Default
    private PrivacySettings privacy = PrivacySettings.builder().build();

    @Builder.Default
    private NotificationSettings notifications = NotificationSettings.builder().build();

    @Builder.Default
    private MessageSettings messages = MessageSettings.builder().build();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
