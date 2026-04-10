package com.chatly.controller;

import com.chatly.proxy.AgentProxyClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/sessions")
@RequiredArgsConstructor
public class AgentSessionController {

    private final AgentProxyClient agentProxy;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ResponseEntity<byte[]> create(
            @RequestBody byte[] body,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(HttpMethod.POST, "/sessions", userId, body);
    }

    @GetMapping
    ResponseEntity<byte[]> list(@AuthenticationPrincipal String userId) {
        return agentProxy.forward(HttpMethod.GET, "/sessions", userId, null);
    }

    @GetMapping("/{sessionId}")
    ResponseEntity<byte[]> get(
            @PathVariable String sessionId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(HttpMethod.GET, "/sessions/" + sessionId, userId, null);
    }

    @DeleteMapping("/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    ResponseEntity<byte[]> delete(
            @PathVariable String sessionId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(HttpMethod.DELETE, "/sessions/" + sessionId, userId, null);
    }

    @GetMapping("/{sessionId}/messages")
    ResponseEntity<byte[]> messages(
            @PathVariable String sessionId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(
                HttpMethod.GET, "/sessions/" + sessionId + "/messages", userId, null);
    }
}

