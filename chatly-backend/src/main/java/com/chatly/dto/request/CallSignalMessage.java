package com.chatly.dto.request;

import com.chatly.model.enums.SignalType;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallSignalMessage {

    private SignalType type;

    private String callId;

    private String senderId;

    private String receiverId;

    private Map<String, Object> payload;
}
