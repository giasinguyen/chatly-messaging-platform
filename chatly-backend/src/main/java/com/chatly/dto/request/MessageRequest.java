package com.chatly.dto.request;

import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Attachment;
import com.chatly.model.mongo.Poll;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageRequest {

    @NotBlank(message = "INVALID_KEY")
    private String conversationId;

    private String content;

    private MessageType type;

    private String replyToId;

    private List<Attachment> attachments;

    private Poll poll;
}
