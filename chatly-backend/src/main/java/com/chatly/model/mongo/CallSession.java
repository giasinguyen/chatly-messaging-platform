package com.chatly.model.mongo;

import com.chatly.model.enums.CallStatus;
import com.chatly.model.enums.CallType;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "call_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallSession {

    @Id
    private String id;

    @Indexed(unique = true)
    private String callId;

    @Indexed
    private String conversationId;

    private String initiatorId;

    @Builder.Default
    private List<String> participants = new ArrayList<>();

    @Builder.Default
    private CallType type = CallType.VOICE;

    @Builder.Default
    private CallStatus status = CallStatus.RINGING;

    /** True for group calls (3+ participants); false for 1:1 calls. */
    @Builder.Default
    private boolean isGroup = false;

    private LocalDateTime startedAt;

    private LocalDateTime endedAt;
}
