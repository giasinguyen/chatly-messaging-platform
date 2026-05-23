package com.chatly.repository.mongo;

import com.chatly.model.enums.PostVisibility;
import com.chatly.model.mongo.Reel;

import java.time.Instant;
import java.util.List;

public interface ReelRepositoryCustom {

    List<Reel> findVisibleFeedReels(
            String requesterId,
            List<String> friendIds,
            List<String> blockedIds,
            Instant before,
            int limit
    );

    List<Reel> findVisibleAuthorReels(
            String authorId,
            List<PostVisibility> visibilities,
            Instant before,
            int limit
    );
}
