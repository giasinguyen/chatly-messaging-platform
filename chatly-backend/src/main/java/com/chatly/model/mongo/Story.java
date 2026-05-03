package com.chatly.model.mongo;

import com.chatly.model.enums.StoryPrivacy;
import com.chatly.model.enums.StoryType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "stories")
@CompoundIndexes({
        @CompoundIndex(def = "{'userId': 1, 'createdAt': -1}")
})
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

    @Builder.Default
    private StoryPrivacy privacy = StoryPrivacy.EVERYONE;

    /** IDs of users who have viewed this story. */
    @Builder.Default
    private List<String> viewerIds = new ArrayList<>();

    @Builder.Default
    private int viewCount = 0;

    @CreatedDate
    @Indexed(expireAfterSeconds = 86400)
    private Instant createdAt;
}
