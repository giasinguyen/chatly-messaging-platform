package com.chatly.dto.response;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupReminderResponse {

    private String id;
    private String conversationId;
    private String creatorId;
    private String title;
    private String description;
    private Instant remindAt;
    private Boolean completed;
    private Instant createdAt;
}
