package com.chatly.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSocialStatsResponse {

    private long followers;
    private long following;
    private long posts;

    /**
     * Extensible slot for future profile statistics and social signals
     * without requiring breaking API changes.
     */
    private Map<String, Object> metadata;
}
