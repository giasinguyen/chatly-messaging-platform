package com.chatly.controller;

import com.chatly.proxy.AgentProxyClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/mcp/servers")
@RequiredArgsConstructor
public class AgentMcpController {

    private final AgentProxyClient agentProxy;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ResponseEntity<byte[]> register(
            @RequestBody byte[] body,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(HttpMethod.POST, "/mcp/servers", userId, body);
    }

    @GetMapping
    ResponseEntity<byte[]> list(@AuthenticationPrincipal String userId) {
        return agentProxy.forward(HttpMethod.GET, "/mcp/servers", userId, null);
    }

    @GetMapping("/{serverId}")
    ResponseEntity<byte[]> get(
            @PathVariable String serverId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(HttpMethod.GET, "/mcp/servers/" + serverId, userId, null);
    }

    @DeleteMapping("/{serverId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    ResponseEntity<byte[]> delete(
            @PathVariable String serverId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(
                HttpMethod.DELETE, "/mcp/servers/" + serverId, userId, null);
    }

    @PatchMapping("/{serverId}/toggle")
    ResponseEntity<byte[]> toggle(
            @PathVariable String serverId,
            @RequestBody byte[] body,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(
                HttpMethod.PATCH, "/mcp/servers/" + serverId + "/toggle", userId, body);
    }

    @GetMapping("/{serverId}/tools")
    ResponseEntity<byte[]> tools(
            @PathVariable String serverId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(
                HttpMethod.GET, "/mcp/servers/" + serverId + "/tools", userId, null);
    }
}

