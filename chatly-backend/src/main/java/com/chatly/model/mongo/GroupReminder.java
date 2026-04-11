package com.chatly.model.mongo;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "group_reminders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupReminder {

    @Id
    private String id;

    @Indexed
    private String conversationId;

    private String creatorId;

    private String title;

    private String description;

    private Instant remindAt;

    @Builder.Default
    private Boolean completed = false;

    @CreatedDate
    private Instant createdAt;
}
