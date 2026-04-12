package com.chatly.controller;

import com.chatly.dto.response.ApiResponse;
import com.chatly.model.mongo.CallSession;
import com.chatly.repository.mongo.CallSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallHistoryController {

    private final CallSessionRepository callSessionRepository;

    @GetMapping("/history")
    ApiResponse<List<CallSession>> getCallHistory(@RequestParam String conversationId) {
        return ApiResponse.<List<CallSession>>builder()
                .result(callSessionRepository.findByConversationIdOrderByStartedAtDesc(conversationId))
                .build();
    }

    @GetMapping("/{callId}")
    ApiResponse<CallSession> getCallDetails(@PathVariable String callId) {
        return ApiResponse.<CallSession>builder()
                .result(callSessionRepository.findByCallId(callId).orElse(null))
                .build();
    }
}
