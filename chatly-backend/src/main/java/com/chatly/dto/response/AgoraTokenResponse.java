package com.chatly.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgoraTokenResponse {

    private String appId;
    private String channelName;
    private int uid;
    private String token;
    private int expiresInSeconds;
}
