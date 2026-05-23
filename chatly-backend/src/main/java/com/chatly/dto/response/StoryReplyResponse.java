package com.chatly.dto.response;

import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryReplyResponse {
    private String id;
    private String storyId;
    private String userId;
    private String content;
    private Instant createdAt;
    private UserResponse user;
}
