package com.chatly.dto.request;

import com.chatly.model.enums.StoryType;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryCreationRequest {
    private StoryType type;
    private String content;
    private String mediaUrl;
    private String musicUrl;
    private String musicName;
    private Integer bgIndex;
    private Integer fontSize;
    private String privacy;
}
