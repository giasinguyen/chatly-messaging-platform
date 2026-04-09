package com.chatly.controller;

import com.chatly.agent.AgentFileListResponse;
import com.chatly.agent.AgentFileResponse;
import com.chatly.dto.response.ApiResponse;
import com.chatly.service.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/ai/sessions/{sessionId}/files")
@RequiredArgsConstructor
public class AgentFileController {

    private final AgentService agentService;

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<AgentFileResponse> upload(
            @PathVariable String sessionId,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        return ApiResponse.<AgentFileResponse>builder()
                .result(agentService.uploadFile(sessionId, file))
                .build();
    }

    @GetMapping
    ApiResponse<AgentFileListResponse> list(@PathVariable String sessionId) {
        return ApiResponse.<AgentFileListResponse>builder()
                .result(agentService.listFiles(sessionId))
                .build();
    }

    @DeleteMapping("/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String sessionId, @PathVariable String fileId) {
        agentService.deleteFile(sessionId, fileId);
    }
}
