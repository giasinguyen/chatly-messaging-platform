package com.chatly.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MusicTrackResponse {
    private String id;
    private String name;
    private String artistName;
    private String albumName;
    private String albumImage;
    private String audioUrl;
    private int duration;
}
