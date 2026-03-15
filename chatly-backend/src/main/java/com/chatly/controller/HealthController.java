package com.chatly.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@Controller
public class HealthController {

    @GetMapping("/")
    public String healthPage() {
        return "health";
    }

    @GetMapping("/api/health")
    @ResponseBody
    public ResponseEntity<Map<String, String>> healthApi() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "message", "Chatly Messaging Platform API is running stably."
        ));
    }
}
