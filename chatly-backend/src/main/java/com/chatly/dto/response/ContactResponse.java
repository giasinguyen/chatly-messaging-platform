package com.chatly.dto.response;

import com.chatly.model.enums.ContactStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactResponse {

    private String id;
    private UserResponse user;
    private UserResponse contact;
    private ContactStatus status;
    private String blockedBy;
    private Instant createdAt;
}
