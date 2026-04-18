package com.chatly.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
@Slf4j
public class McpSecurityInterceptor extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-Internal-API-Key";
    private static final String USER_ID_HEADER = "X-User-Id";

    private final String internalApiKey;
    private final String mcpPathPrefix;

    public McpSecurityInterceptor(
            @Value("${app.mcp.internal-api-key}") String internalApiKey,
            @Value("${spring.ai.mcp.server.sse-endpoint:/api/ai/mcp/sse}") String sseEndpoint
    ) {
        this.internalApiKey = internalApiKey;
        // Intercept all requests whose path starts with the MCP base prefix.
        // Both /api/ai/mcp/sse and /api/ai/mcp/message share this prefix.
        int lastSlash = sseEndpoint.lastIndexOf('/');
        this.mcpPathPrefix = lastSlash > 0 ? sseEndpoint.substring(0, lastSlash) : sseEndpoint;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String requestPath = request.getRequestURI();
        return requestPath == null || !requestPath.startsWith(mcpPathPrefix);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String apiKey = request.getHeader(API_KEY_HEADER);
        if (!StringUtils.hasText(apiKey) || !apiKey.equals(internalApiKey)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid internal API key");
            return;
        }

        String userId = request.getHeader(USER_ID_HEADER);
        if (!StringUtils.hasText(userId)) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing X-User-Id header");
            return;
        }

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(userId, null, new ArrayList<>());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        try {
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
