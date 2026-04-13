package com.chatly.model.mongo;

import com.chatly.model.enums.MessageStatus;
import com.chatly.model.enums.MessageType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "messages")
@CompoundIndex(def = "{'conversationId': 1, 'createdAt': -1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    private String id;

    private String conversationId;

    private String senderId;

    private String content;

    @Builder.Default
    private MessageType type = MessageType.TEXT;

    @Builder.Default
    private MessageStatus status = MessageStatus.SENT;

    private String replyToId;

    private String forwardedFromId;

    private String forwardedFromConversationId;

    @Builder.Default
    private List<Attachment> attachments = new ArrayList<>();

    @Builder.Default
    private List<ReadReceipt> readBy = new ArrayList<>();

    // Recall fields
    @Builder.Default
    private boolean recalled = false;
    private Instant recalledAt;
    private String recalledBy;

    // Edit fields
    @Builder.Default
    private boolean edited = false;
    private Instant editedAt;

    @Builder.Default
    private List<EditHistory> editHistory = new ArrayList<>();

    @Builder.Default
    private List<Reaction> reactions = new ArrayList<>();

    // Poll (for POLL type messages)
    private Poll poll;

    // Pin
    @Builder.Default
    private boolean pinned = false;
    private Instant pinnedAt;
    private String pinnedBy;

    // Priority tag (NORMAL, IMPORTANT, URGENT)
    private String priority;

    // Mentions – list of user IDs mentioned in this message ("all" for @all)
    @Builder.Default
    private List<String> mentions = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
