package com.chatly.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.JsonNode;
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

    /** ipwho.is JSON snapshot when available (same shape as {@code GET https://ipwho.is/{ip}}). */
    private JsonNode geoSnapshot;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant lastSeenAt;

    /** True if this row is the JWT session used for the current request */
    private boolean current;

    private boolean revoked;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant revokedAt;
}
