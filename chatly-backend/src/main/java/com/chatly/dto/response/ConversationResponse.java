package com.chatly.dto.response;

import com.chatly.model.enums.ConversationType;
import com.chatly.model.mongo.LastMessage;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationResponse {

    private String id;
    private ConversationType type;
    private String name;
    private String avatarUrl;
    private String creatorId;
    private List<String> participantIds;
    private LastMessage lastMessage;
    private Instant createdAt;
    private Instant updatedAt;
}
