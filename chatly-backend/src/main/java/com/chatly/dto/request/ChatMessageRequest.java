package com.chatly.dto.request;

import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Attachment;
import com.chatly.model.mongo.Poll;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageRequest {

    private String conversationId;
    private String content;
    private MessageType type;
    private String replyToId;
    private List<Attachment> attachments;
    private Poll poll;
}
