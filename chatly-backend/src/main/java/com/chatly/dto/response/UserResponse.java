package com.chatly.dto.response;

import com.chatly.model.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private String id;
    private String username;
    private String email;
    private boolean emailVerified;
    private String displayName;
    private String avatarUrl;
    private String phone;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd", timezone = "UTC")
    private Instant dob;

    private String bio;
    private UserStatus status;
    private Instant lastSeen;
    private Instant createdAt;
    private Instant updatedAt;

    /**
     * True when the caller has been blocked by this user — only id, displayName,
     * and avatarUrl are populated; all other fields are null/default.
     */
    private boolean limited;
}
