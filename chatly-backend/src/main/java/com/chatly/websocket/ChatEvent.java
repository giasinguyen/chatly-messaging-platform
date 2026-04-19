package com.chatly.websocket;

import com.chatly.dto.response.MessageResponse;
import com.chatly.dto.response.ConversationResponse;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatEvent {

    private ChatAction action;
    private MessageResponse message;
    private ConversationResponse conversationData;

    public enum ChatAction {
        SEND, EDIT, RECALL, DELETE, GROUP_UPDATE, REACT, ROLE_UPDATED
    }

}
