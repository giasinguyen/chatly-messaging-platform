package com.chatly.model.mongo;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "story_replies")
@CompoundIndexes({
        @CompoundIndex(def = "{'storyId': 1, 'createdAt': -1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoryReply {

    @Id
    private String id;

    private String storyId;

    private String userId;

    private String content;

    @CreatedDate
    @Indexed(expireAfterSeconds = 86400)
    private Instant createdAt;
}
