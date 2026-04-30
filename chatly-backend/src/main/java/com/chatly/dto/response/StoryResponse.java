package com.chatly.dto.response;

import com.chatly.model.enums.StoryType;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryResponse {
    private String id;
    private String userId;
    private StoryType type;
    private String content;
    private String mediaUrl;
    private String musicUrl;
    private String musicName;
    private Integer bgIndex;
    private Integer fontSize;
    private String privacy;
    private Instant createdAt;
}
