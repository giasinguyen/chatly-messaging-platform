package com.chatly.exception;

import com.chatly.dto.response.ApiResponse;
import com.chatly.proxy.AgentProxyException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @Value("${spring.ai.mcp.server.sse-endpoint:/api/ai/mcp/sse}")
    private String mcpSseEndpoint;

    /**
     * The Spring AI MCP server has its own error handling for JSON-RPC requests.
     * Letting GlobalExceptionHandler wrap those errors in ApiResponse would break
     * the JSON-RPC protocol contract that chatly-agent expects.
     */
    private boolean isMcpRequest(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) return false;
        // Both /api/ai/mcp/sse and /api/ai/mcp/message share the same base prefix.
        int lastSlash = mcpSseEndpoint.lastIndexOf('/');
        String mcpPrefix = lastSlash > 0 ? mcpSseEndpoint.substring(0, lastSlash) : mcpSseEndpoint;
        return uri.startsWith(mcpPrefix);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleException(Exception exception, HttpServletRequest request) {
        if (isMcpRequest(request)) {
            log.error("Unhandled exception in MCP endpoint: ", exception);
            throw new RuntimeException(exception);
        }
        log.error("Unhandled exception: ", exception);
        ErrorCode errorCode = ErrorCode.UNCATEGORIZED_EXCEPTION;

        return ResponseEntity.status(errorCode.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(AppException.class)
    ResponseEntity<ApiResponse<Void>> handleAppException(AppException exception) {
        ErrorCode errorCode = exception.getErrorCode();

        return ResponseEntity.status(errorCode.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException exception) {
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        return ResponseEntity.status(errorCode.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException exception) {
        var fieldError = exception.getFieldError();
        String enumKey = (fieldError != null) ? fieldError.getDefaultMessage() : null;

        ErrorCode errorCode = ErrorCode.INVALID_KEY;
        if (enumKey != null) {
            try {
                errorCode = ErrorCode.valueOf(enumKey);
            } catch (IllegalArgumentException e) {
                log.warn("Unknown error code key: {}", enumKey);
            }
        }

        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(AgentProxyException.class)
    ResponseEntity<ApiResponse<Void>> handleAgentProxy(AgentProxyException ex) {
        log.error("Agent proxy error: {}", ex.getMessage());
        ErrorCode errorCode = ex.getAgentStatusCode().is5xxServerError()
                ? ErrorCode.AGENT_SERVICE_ERROR
                : ErrorCode.AGENT_BAD_REQUEST;

        return ResponseEntity.status(errorCode.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }
}
