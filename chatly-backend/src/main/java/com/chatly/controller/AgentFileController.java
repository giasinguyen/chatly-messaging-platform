package com.chatly.controller;

import com.chatly.proxy.AgentProxyClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/ai/sessions/{sessionId}/files")
@RequiredArgsConstructor
public class AgentFileController {

    private final AgentProxyClient agentProxy;

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    ResponseEntity<byte[]> upload(
            @PathVariable String sessionId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal String userId
    ) throws IOException {
        return agentProxy.forwardMultipart(
                "/sessions/" + sessionId + "/files",
                userId,
                file
        );
    }

    @GetMapping
    ResponseEntity<byte[]> list(
            @PathVariable String sessionId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(
                HttpMethod.GET, "/sessions/" + sessionId + "/files", userId, null);
    }

    @DeleteMapping("/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    ResponseEntity<byte[]> delete(
            @PathVariable String sessionId,
            @PathVariable String fileId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(
                HttpMethod.DELETE, "/sessions/" + sessionId + "/files/" + fileId, userId, null);
    }
}

