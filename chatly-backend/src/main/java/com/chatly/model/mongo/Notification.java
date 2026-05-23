package com.chatly.model.mongo;

import com.chatly.model.enums.NotificationType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "notifications")
@CompoundIndexes({
        @CompoundIndex(def = "{'receiverId': 1, 'createdAt': -1}"),
        @CompoundIndex(def = "{'receiverId': 1, 'type': 1, 'referenceId': 1, 'read': 1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    private String id;

    private NotificationType type;

    private String senderId;

    private String receiverId;

    /** Contextual ID: conversationId for NEW_MESSAGE, senderId for FRIEND_REQUEST, conversationId for GROUP_INVITE */
    private String referenceId;

    private String content;

    @Builder.Default
    private boolean read = false;

    @CreatedDate
    private Instant createdAt;
}
