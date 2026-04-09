package com.chatly.controller;

import com.chatly.agent.AgentChatRequest;
import com.chatly.agent.AgentChatResponse;
import com.chatly.dto.request.AiChatRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.service.AgentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

@RestController
@RequestMapping("/api/ai/sessions/{sessionId}/chat")
@RequiredArgsConstructor
public class AgentChatController {

    private final AgentService agentService;

    @PostMapping
    ApiResponse<AgentChatResponse> send(
            @PathVariable String sessionId,
            @RequestBody @Valid AiChatRequest request
    ) {
        AgentChatRequest agentReq = new AgentChatRequest(
                sessionId,
                request.getMessage(),
                request.getAgentType(),
                request.isUseWebSearch(),
                request.getMcpServerIds()
        );
        return ApiResponse.<AgentChatResponse>builder()
                .result(agentService.chat(sessionId, agentReq))
                .build();
    }

    /**
     * SSE streaming endpoint — uses {@link SseEmitter} to bridge the reactive
     * {@code Flux<String>} from AgentClient onto the servlet response.
     * Spring MVC (servlet stack) requires SseEmitter; WebFlux is not used here.
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    SseEmitter stream(
            @PathVariable String sessionId,
            @RequestBody @Valid AiChatRequest request
    ) {
        SseEmitter emitter = new SseEmitter(agentService.streamTimeoutMs());

        AgentChatRequest agentReq = new AgentChatRequest(
                sessionId,
                request.getMessage(),
                request.getAgentType(),
                request.isUseWebSearch(),
                request.getMcpServerIds()
        );

        agentService.stream(sessionId, agentReq)
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
}
