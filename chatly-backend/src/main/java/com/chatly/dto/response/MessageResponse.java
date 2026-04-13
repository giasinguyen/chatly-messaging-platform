package com.chatly.dto.response;

import com.chatly.model.enums.MessageStatus;
import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Attachment;
import com.chatly.model.mongo.EditHistory;
import com.chatly.model.mongo.Poll;
import com.chatly.model.mongo.Reaction;
import com.chatly.model.mongo.ReadReceipt;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {

    private String id;
    private String conversationId;
    private String senderId;
    private String content;
    private MessageType type;
    private MessageStatus status;
    private String replyToId;
    private String forwardedFromId;
    private String forwardedFromConversationId;
    private List<Attachment> attachments;
    private List<ReadReceipt> readBy;

    // Recall fields
    private boolean recalled;
    private Instant recalledAt;
    private String recalledBy;

    // Edit fields
    private boolean edited;
    private Instant editedAt;
    private List<EditHistory> editHistory;

    private List<Reaction> reactions;

    // Poll
    private Poll poll;

    // Pin
    private boolean pinned;
    private Instant pinnedAt;
    private String pinnedBy;

    // Priority tag
    private String priority;

    // Mentions
    private List<String> mentions;

    private Instant createdAt;
    private Instant updatedAt;
}
