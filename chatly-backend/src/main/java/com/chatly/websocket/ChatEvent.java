package com.chatly.websocket;

import com.chatly.dto.response.MessageResponse;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatEvent {

    private ChatAction action;
    private MessageResponse message;

    public enum ChatAction {
        SEND, EDIT, RECALL, DELETE, REACT
    }
}
