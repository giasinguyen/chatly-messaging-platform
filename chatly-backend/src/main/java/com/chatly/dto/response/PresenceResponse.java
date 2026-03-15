package com.chatly.dto.response;

import com.chatly.model.enums.UserStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PresenceResponse {

    private String userId;
    private UserStatus status;
    private Instant lastSeen;
}
