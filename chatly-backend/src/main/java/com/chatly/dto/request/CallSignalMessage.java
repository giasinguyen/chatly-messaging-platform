package com.chatly.dto.request;

import com.chatly.model.enums.SignalType;
import lombok.*;

import java.util.List;
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

    /** Target for point-to-point signals. Null for broadcast group signals. */
    private String receiverId;

    /** Target list for multi-cast group signals (GROUP_INITIATE only). */
    private List<String> targetIds;

    private Map<String, Object> payload;
}
