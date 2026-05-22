package com.chatly.model.mongo;

import com.chatly.model.enums.PostVisibility;
import lombok.*;
import lombok.AccessLevel;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "reels")
@CompoundIndexes({
        @CompoundIndex(def = "{'authorId': 1, 'createdAt': -1}"),
        @CompoundIndex(def = "{'visibility': 1, 'createdAt': -1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reel {

    @Id
    private String id;

    private String authorId;

    private String caption;

    private String videoUrl;

    private String fileId;

    @Builder.Default
    private PostVisibility visibility = PostVisibility.PUBLIC;

    @Builder.Default
    @Getter(AccessLevel.NONE)
    private List<String> viewerIds = new ArrayList<>();

    public List<String> getViewerIds() {
        if (viewerIds == null) {
            viewerIds = new ArrayList<>();
        }
        return viewerIds;
    }

    @Builder.Default
    private int viewCount = 0;

    @Builder.Default
    private boolean isDeleted = false;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
