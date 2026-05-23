package com.chatly.model.mongo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostComment {

    private String id;

    private String userId;

    private String content;

    private Instant createdAt;

    private Instant updatedAt;

    private String parentCommentId;

    @Builder.Default
    private List<String> mediaUrls = new ArrayList<>();

    @Builder.Default
    private List<PostReaction> reactions = new ArrayList<>();

    private boolean isAiGenerated;

    private String triggerType;
}
