package com.chatly.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSessionResponse {

    private String id;
    private String platform;
    private String deviceLabel;
    private String ipAddress;
    private String locationLabel;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant lastSeenAt;

    /** True if this row is the JWT session used for the current request */
    private boolean current;
}
