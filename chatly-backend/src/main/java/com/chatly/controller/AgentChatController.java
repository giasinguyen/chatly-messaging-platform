package com.chatly.controller;

import com.chatly.proxy.AgentProxyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

@RestController
@RequestMapping("/api/ai/sessions/{sessionId}/chat")
@RequiredArgsConstructor
@Slf4j
public class AgentChatController {

    private final AgentProxyClient agentProxy;

    @PostMapping
    ResponseEntity<byte[]> chat(
            @PathVariable String sessionId,
            @RequestBody byte[] body,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(
                org.springframework.http.HttpMethod.POST,
                "/sessions/" + sessionId + "/chat",
                userId,
                body
        );
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    SseEmitter stream(
            @PathVariable String sessionId,
            @RequestBody byte[] body,
            @AuthenticationPrincipal String userId
    ) {
        SseEmitter emitter = new SseEmitter(agentProxy.streamTimeoutMs());

        agentProxy.forwardStream(
                        "/sessions/" + sessionId + "/chat/stream",
                        userId,
                        body
                )
                .doOnNext(token -> {
                    try {
                        emitter.send(SseEmitter.event().data(token));
                    } catch (IOException e) {
                        emitter.completeWithError(e);
                    }
                })
                .doOnComplete(emitter::complete)
                .doOnError(emitter::completeWithError)
                .subscribe();

        return emitter;
    }

    @PostMapping(value = "/stream/resume", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    SseEmitter resume(
            @PathVariable String sessionId,
            @RequestBody byte[] body,
            @AuthenticationPrincipal String userId
    ) {
        SseEmitter emitter = new SseEmitter(agentProxy.streamTimeoutMs());

        agentProxy.forwardStream(
                        "/sessions/" + sessionId + "/chat/stream/resume",
                        userId,
                        body
                )
                .doOnNext(token -> {
                    try {
                        emitter.send(SseEmitter.event().data(token));
                    } catch (IOException e) {
                        emitter.completeWithError(e);
                    }
                })
                .doOnComplete(emitter::complete)
                .doOnError(emitter::completeWithError)
                .subscribe();

        return emitter;
    }

    @GetMapping("/status")
    ResponseEntity<byte[]> status(
            @PathVariable String sessionId,
            @AuthenticationPrincipal String userId
    ) {
        return agentProxy.forward(
                org.springframework.http.HttpMethod.GET,
                "/sessions/" + sessionId + "/chat/status",
                userId,
                null
        );
    }
}

