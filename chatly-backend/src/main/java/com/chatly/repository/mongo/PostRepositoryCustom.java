package com.chatly.repository.mongo;

import com.chatly.model.enums.PostVisibility;
import com.chatly.model.mongo.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

/**
 * Custom MongoDB query methods that require {@code MongoTemplate} (cursor-based pagination
 * and aggregation-computed sort) and cannot be expressed with Spring Data DSL alone.
 */
public interface PostRepositoryCustom {

    /**
     * Fetches posts for the home/user feed using cursor-based pagination.
     *
    * @param authorIds    posts authored by any of these IDs (typically: followingIds plus self)
     * @param excludeIds   posts authored by any of these IDs are excluded (blocked users + self)
     * @param visibilities only posts with one of these visibility values are included
     * @param before       return only posts created strictly before this instant (the cursor)
     * @param limit        maximum number of posts to return
     * @return list ordered by createdAt descending, length ≤ limit
     */
    List<Post> findFeedPosts(
            List<String> authorIds,
            List<String> excludeIds,
            List<PostVisibility> visibilities,
            Instant before,
            int limit
    );

    /**
     * Fetches the explore feed: recent PUBLIC posts sorted by engagement score descending.
     * Score = reactions.size() + commentCount * 2 + shareCount * 3.
     *
     * @param since  include only posts created on or after this instant (7-day window)
     * @param before cursor upper bound
     * @param limit  maximum number of posts to return
     * @return list ordered by engagementScore descending, then createdAt descending
     */
    List<Post> findExplorePosts(Instant since, Instant before, int limit);

    /**
     * Full-text search across public posts by keyword and/or hashtag.
     *
     * @param keyword  substring to match against post content (null = no content filter)
     * @param hashtag  exact hashtag to filter by, without the '#' prefix (null = no hashtag filter)
     * @param pageable pagination and sort
     * @return page of matching PUBLIC, non-deleted posts
     */
    Page<Post> searchPublicPosts(String keyword, String hashtag, Pageable pageable);

    /**
     * Returns top hashtags sorted by usage frequency in PUBLIC non-deleted posts.
     *
     * @param limit maximum number of hashtags to return
     * @return ordered hashtag list without the '#' prefix
     */
    List<String> findTrendingHashtags(int limit);
}
