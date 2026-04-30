package com.chatly.service;

import com.chatly.dto.response.MusicTrackResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class MusicService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private WebClient webClient;

    @Autowired
    public MusicService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClientBuilder = webClientBuilder;
        this.objectMapper = objectMapper;
    }

    @Value("${app.music.jamendo.client-id}")
    private String clientId;

    @Value("${app.music.jamendo.base-url:https://api.jamendo.com/v3.0}")
    private String baseUrl;

    @PostConstruct
    public void init() {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .build();
    }

    public List<MusicTrackResponse> searchTracks(String genre) {
        log.debug("Searching music tracks for genre: {}", genre);

        String responseBody = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/tracks")
                        .queryParam("client_id", clientId)
                        .queryParam("format", "json")
                        .queryParam("results_count", 20)
                        .queryParam("search", genre)
                        .queryParam("include", "musicinfo")
                        .queryParam("order", "popularity_total")
                        .build())
                .retrieve()
                .onStatus(HttpStatusCode::isError, clientResponse -> clientResponse.bodyToMono(String.class)
                        .map(body -> {
                            log.error("Jamendo API error: {} - {}", clientResponse.statusCode(), body);
                            return new AppException(ErrorCode.AGENT_SERVICE_ERROR);
                        }))
                .bodyToMono(String.class)
                .block();

        List<MusicTrackResponse> tracks = new ArrayList<>();
        if (responseBody != null) {
            try {
                JsonNode response = objectMapper.readTree(responseBody);
                if (response.has("results")) {
                    JsonNode results = response.get("results");
                    for (JsonNode node : results) {
                        tracks.add(MusicTrackResponse.builder()
                                .id(node.path("id").asText())
                                .name(node.path("name").asText())
                                .artistName(node.path("artist_name").asText())
                                .albumName(node.path("album_name").asText())
                                .albumImage(node.path("album_image").asText())
                                .audioUrl(node.path("audio").asText())
                                .duration(node.path("duration").asInt())
                                .build());
                    }
                }
            } catch (Exception e) {
                log.error("Error parsing Jamendo response", e);
            }
        }

        return tracks;
    }
}
