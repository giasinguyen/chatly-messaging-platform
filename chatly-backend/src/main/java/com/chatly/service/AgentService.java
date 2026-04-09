package com.chatly.service;

import com.chatly.agent.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.List;

/**
 * Thin service that resolves the current user from the security context and
 * delegates every call to {@link AgentClient}. Controllers use this service
 * instead of calling AgentClient directly so they stay clean.
 */
@Service
@RequiredArgsConstructor
public class AgentService {

    private final AgentClient agentClient;

    @Value("${agent.stream-timeout-seconds:120}")
    private int streamTimeoutSeconds;

    // ── Sessions ──────────────────────────────────────────────────────────────

    public AgentSessionResponse createSession(String title) {
        AgentSessionRequest req = new AgentSessionRequest(title);
        return agentClient.createSession(req, userId(), "user");
    }

    public AgentSessionListResponse listSessions() {
        return agentClient.listSessions(userId(), "user");
    }

    public AgentSessionResponse getSession(String sessionId) {
        return agentClient.getSession(sessionId, userId(), "user");
    }

    public void deleteSession(String sessionId) {
        agentClient.deleteSession(sessionId, userId(), "user");
    }

    public AgentMessageHistoryResponse getHistory(String sessionId) {
        return agentClient.getHistory(sessionId, userId(), "user");
    }

    // ── Chat ──────────────────────────────────────────────────────────────────

    public AgentChatResponse chat(String sessionId, AgentChatRequest request) {
        return agentClient.chat(request, userId(), "user");
    }

    public Flux<String> stream(String sessionId, AgentChatRequest request) {
        return agentClient.stream(request, userId(), "user");
    }

    // ── Files ─────────────────────────────────────────────────────────────────

    public AgentFileResponse uploadFile(String sessionId, MultipartFile file) throws IOException {
        return agentClient.uploadFile(sessionId, file, userId(), "user");
    }

    public AgentFileListResponse listFiles(String sessionId) {
        return agentClient.listFiles(sessionId, userId(), "user");
    }

    public void deleteFile(String sessionId, String fileId) {
        agentClient.deleteFile(sessionId, fileId, userId(), "user");
    }

    // ── MCP Servers ───────────────────────────────────────────────────────────

    public AgentMcpServerResponse registerMcpServer(AgentMcpServerRequest request) {
        return agentClient.registerMcpServer(request, userId(), "user");
    }

    public List<AgentMcpServerResponse> listMcpServers() {
        return agentClient.listMcpServers(userId(), "user");
    }

    public AgentMcpServerResponse getMcpServer(String serverId) {
        return agentClient.getMcpServer(serverId, userId(), "user");
    }

    public AgentMcpServerResponse updateMcpServer(String serverId, AgentMcpServerUpdateRequest request) {
        return agentClient.updateMcpServer(serverId, request, userId(), "user");
    }

    public void deleteMcpServer(String serverId) {
        agentClient.deleteMcpServer(serverId, userId(), "user");
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private String userId() {
        return SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal()
                .toString();
    }

    /** Expose stream timeout in milliseconds for SseEmitter in controllers. */
    public long streamTimeoutMs() {
        return streamTimeoutSeconds * 1000L;
    }
}
