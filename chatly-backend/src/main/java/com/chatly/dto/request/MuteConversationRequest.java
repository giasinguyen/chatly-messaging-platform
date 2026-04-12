package com.chatly.dto.request;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MuteConversationRequest {

    /** Optional: if null, mute indefinitely */
    private Instant muteUntil;
}
