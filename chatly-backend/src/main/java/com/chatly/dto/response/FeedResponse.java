package com.chatly.dto.response;

import lombok.*;

import java.util.List;

/**
 * Cursor-based feed page. Use {@code nextCursor} as the {@code cursor} param of the next request.
 * When {@code hasMore} is false, there are no more items to load.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedResponse {

    private List<PostResponse> items;

    /** ISO-8601 UTC timestamp of the oldest item on this page, or null when hasMore is false. */
    private String nextCursor;

    private boolean hasMore;
}
