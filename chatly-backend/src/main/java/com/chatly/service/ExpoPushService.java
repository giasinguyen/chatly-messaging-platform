package com.chatly.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
public class ExpoPushService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

    public void sendPushNotification(Set<String> tokens, String title, String body, Map<String, Object> data) {
        if (tokens == null || tokens.isEmpty()) {
            return;
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        for (String token : tokens) {
            Map<String, Object> message = new HashMap<>();
            message.put("to", token);
            message.put("sound", "default");
            message.put("title", title);
            message.put("body", body);
            message.put("data", data);
            messages.add(message);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("Accept-Encoding", "gzip, deflate");

        HttpEntity<List<Map<String, Object>>> request = new HttpEntity<>(messages, headers);

        try {
            restTemplate.postForObject(EXPO_PUSH_API_URL, request, String.class);
            log.info("Sent push notifications to {} devices", tokens.size());
        } catch (Exception e) {
            log.error("Failed to send Expo push notifications: {}", e.getMessage());
        }
    }
}
