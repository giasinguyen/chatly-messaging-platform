package com.chatly.dto.response;

import com.chatly.model.enums.PostVisibility;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostResponse {

    private String id;
    private String authorId;
    private String content;
    private List<String> mediaUrls;
    private PostVisibility visibility;
    private List<String> hashtags;
    private List<PostReactionSummary> reactions;
    private int commentCount;
    private int shareCount;
    private Instant createdAt;
    private Instant updatedAt;
}
