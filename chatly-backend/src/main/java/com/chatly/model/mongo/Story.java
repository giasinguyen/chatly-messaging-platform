package com.chatly.model.mongo;

import com.chatly.model.enums.StoryType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "stories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Story {

    @Id
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

    @CreatedDate
    @Indexed(expireAfterSeconds = 86400)
    private Instant createdAt;
}
