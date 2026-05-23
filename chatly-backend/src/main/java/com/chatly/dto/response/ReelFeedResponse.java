package com.chatly.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReelFeedResponse {

    private List<ReelResponse> items;
    private String nextCursor;
    private boolean hasMore;
}
