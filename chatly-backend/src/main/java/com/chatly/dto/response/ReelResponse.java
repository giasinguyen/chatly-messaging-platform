package com.chatly.dto.response;

import com.chatly.model.enums.PostVisibility;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReelResponse {

    private String id;
    private String authorId;
    private String authorUsername;
    private String authorDisplayName;
    private String authorAvatarUrl;
    private String caption;
    private String videoUrl;
    private PostVisibility visibility;
    private int viewCount;
    private Instant createdAt;
    private Instant updatedAt;
}
