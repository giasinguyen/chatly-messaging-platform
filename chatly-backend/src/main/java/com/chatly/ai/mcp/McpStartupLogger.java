package com.chatly.ai.mcp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class McpStartupLogger {

    @Value("${spring.ai.mcp.server.enabled:true}")
    private boolean mcpEnabled;

    @Value("${spring.ai.mcp.server.sse-endpoint:/api/ai/mcp/sse}")
    private String sseEndpoint;

    @Value("${spring.ai.mcp.server.sse-message-endpoint:/api/ai/mcp/message}")
    private String sseMessageEndpoint;

    @Value("${spring.ai.mcp.server.name:chatly-backend-mcp}")
    private String serverName;

    @Value("${spring.ai.mcp.server.version:0.0.1}")
    private String serverVersion;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (mcpEnabled) {
            log.info(
                "MCP server ready — name='{}' version='{}' sse='{}' message='{}'",
                serverName,
                serverVersion,
                sseEndpoint,
                sseMessageEndpoint
            );
        } else {
            log.warn("MCP server is DISABLED (spring.ai.mcp.server.enabled=false)");
        }
    }
}
