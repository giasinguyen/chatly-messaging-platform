package com.chatly.model.mongo;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "pending_join_requests")
@CompoundIndex(def = "{'conversationId': 1, 'userId': 1}", unique = true)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingJoinRequest {

    @Id
    private String id;

    private String conversationId;

    private String userId;

    private String invitedBy;

    @CreatedDate
    private Instant createdAt;
}
