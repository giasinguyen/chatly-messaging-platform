package com.chatly.dto.response;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupNoteResponse {

    private String id;
    private String conversationId;
    private String creatorId;
    private String title;
    private String content;
    private Boolean pinned;
    private Instant createdAt;
    private Instant updatedAt;
}
