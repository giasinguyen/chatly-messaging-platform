package com.chatly.controller;

import com.chatly.agent.AgentSessionListResponse;
import com.chatly.agent.AgentSessionResponse;
import com.chatly.agent.AgentMessageHistoryResponse;
import com.chatly.dto.request.AiSessionCreateRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.service.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/sessions")
@RequiredArgsConstructor
public class AgentSessionController {

    private final AgentService agentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<AgentSessionResponse> create(@RequestBody AiSessionCreateRequest request) {
        return ApiResponse.<AgentSessionResponse>builder()
                .result(agentService.createSession(request.getTitle()))
                .build();
    }

    @GetMapping
    ApiResponse<AgentSessionListResponse> list() {
        return ApiResponse.<AgentSessionListResponse>builder()
                .result(agentService.listSessions())
                .build();
    }

    @GetMapping("/{sessionId}")
    ApiResponse<AgentSessionResponse> get(@PathVariable String sessionId) {
        return ApiResponse.<AgentSessionResponse>builder()
                .result(agentService.getSession(sessionId))
                .build();
    }

    @DeleteMapping("/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String sessionId) {
        agentService.deleteSession(sessionId);
    }

    @GetMapping("/{sessionId}/messages")
    ApiResponse<AgentMessageHistoryResponse> history(@PathVariable String sessionId) {
        return ApiResponse.<AgentMessageHistoryResponse>builder()
                .result(agentService.getHistory(sessionId))
                .build();
    }
}
