package com.chatly.model.mongo;

import com.chatly.model.enums.MessageType;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LastMessage {

    private String senderId;
    private String content;
    private MessageType type;
    private Instant timestamp;
}
