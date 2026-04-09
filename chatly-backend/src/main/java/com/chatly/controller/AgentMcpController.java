package com.chatly.controller;

import com.chatly.agent.AgentMcpServerRequest;
import com.chatly.agent.AgentMcpServerResponse;
import com.chatly.agent.AgentMcpServerUpdateRequest;
import com.chatly.dto.request.AiMcpServerRequest;
import com.chatly.dto.response.ApiResponse;
import com.chatly.service.AgentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai/mcp/servers")
@RequiredArgsConstructor
public class AgentMcpController {

    private final AgentService agentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<AgentMcpServerResponse> register(@RequestBody @Valid AiMcpServerRequest request) {
        AgentMcpServerRequest agentReq = new AgentMcpServerRequest(
                request.getName(),
                request.getUrl(),
                request.getHeaders()
        );
        return ApiResponse.<AgentMcpServerResponse>builder()
                .result(agentService.registerMcpServer(agentReq))
                .build();
    }

    @GetMapping
    ApiResponse<List<AgentMcpServerResponse>> list() {
        return ApiResponse.<List<AgentMcpServerResponse>>builder()
                .result(agentService.listMcpServers())
                .build();
    }

    @GetMapping("/{serverId}")
    ApiResponse<AgentMcpServerResponse> get(@PathVariable String serverId) {
        return ApiResponse.<AgentMcpServerResponse>builder()
                .result(agentService.getMcpServer(serverId))
                .build();
    }

    @PatchMapping("/{serverId}")
    ApiResponse<AgentMcpServerResponse> update(
            @PathVariable String serverId,
            @RequestBody AgentMcpServerUpdateRequest request
    ) {
        return ApiResponse.<AgentMcpServerResponse>builder()
                .result(agentService.updateMcpServer(serverId, request))
                .build();
    }

    @DeleteMapping("/{serverId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String serverId) {
        agentService.deleteMcpServer(serverId);
    }
}
