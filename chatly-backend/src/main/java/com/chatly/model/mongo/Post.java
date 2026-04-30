package com.chatly.model.mongo;

import com.chatly.model.enums.PostVisibility;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "posts")
@CompoundIndexes({
        @CompoundIndex(def = "{'authorId': 1, 'createdAt': -1}"),
        @CompoundIndex(def = "{'visibility': 1, 'createdAt': -1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    private String id;

    private String authorId;

    private String content;

    /** Immutable after creation — set only during create. */
    @Builder.Default
    private List<String> mediaUrls = new ArrayList<>();

    @Builder.Default
    private PostVisibility visibility = PostVisibility.PUBLIC;

    /** Extracted automatically from content via #hashtag regex. */
    @Builder.Default
    private List<String> hashtags = new ArrayList<>();

    @Builder.Default
    private List<PostReaction> reactions = new ArrayList<>();

    @Builder.Default
    private int commentCount = 0;

    @Builder.Default
    private int shareCount = 0;

    @Builder.Default
    private boolean isDeleted = false;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
