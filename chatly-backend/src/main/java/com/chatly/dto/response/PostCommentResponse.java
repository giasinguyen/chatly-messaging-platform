package com.chatly.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostCommentResponse {

    private String id;

    private String userId;

    private String userUsername;

    private String userDisplayName;

    private String userAvatarUrl;

    private String content;

    private Instant createdAt;
}
