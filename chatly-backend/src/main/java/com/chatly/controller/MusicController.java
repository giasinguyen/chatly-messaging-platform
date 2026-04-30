package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.dto.response.MusicTrackResponse;
import com.chatly.service.MusicService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/music")
@RequiredArgsConstructor
public class MusicController {

    private final MusicService musicService;

    @GetMapping("/search")
    public ApiResponse<List<MusicTrackResponse>> search(@RequestParam(defaultValue = "chill") String genre) {
        return ApiResponse.<List<MusicTrackResponse>>builder()
                .result(musicService.searchTracks(genre))
                .build();
    }
}
