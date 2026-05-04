package com.chatly.dto.response;

import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryReactionResponse {
    private String id;
    private String storyId;
    private String userId;
    private String emoji;
    private Instant createdAt;
    private UserResponse user;
}
