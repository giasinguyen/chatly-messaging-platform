package com.chatly.model.mongo;

import com.chatly.model.enums.ConversationType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Document(collection = "conversations")
@CompoundIndex(def = "{'participantIds': 1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    private String id;

    private ConversationType type;

    private String name;

    private String avatarUrl;

    private String creatorId;

    @Builder.Default
    private List<String> participantIds = new ArrayList<>();

    private LastMessage lastMessage;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Builder.Default
    private Boolean allowMembersUpdateInfo = true;

    @Builder.Default
    private Boolean requireApproval = false;

    private String inviteToken;

    /** User IDs who pinned this conversation */
    @Builder.Default
    private Set<String> pinnedBy = new HashSet<>();

    /** userId -> muteUntil (null value = muted indefinitely) */
    @Builder.Default
    private Map<String, Instant> mutedBy = new HashMap<>();

    /** User IDs who soft-deleted this conversation from their chat list */
    @Builder.Default
    private Set<String> deletedBy = new HashSet<>();
}
