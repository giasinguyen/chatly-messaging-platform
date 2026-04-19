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
import org.springframework.web.servlet.resource.NoResourceFoundException;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @Value("${spring.ai.mcp.server.sse-endpoint:/api/ai/mcp/sse}")
    private String mcpSseEndpoint;

    @Value("${spring.ai.mcp.server.sse-message-endpoint:/api/ai/mcp/message}")
    private String mcpMessageEndpoint;

    /**
     * Returns true only for the two Spring AI protocol paths (/mcp/sse and /mcp/message).
     * User-facing CRUD endpoints (/api/ai/mcp/servers/**) are NOT MCP protocol requests
     * and must be wrapped in ApiResponse like any other endpoint.
     */
    private boolean isMcpProtocolRequest(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri != null && (uri.equals(mcpSseEndpoint) || uri.equals(mcpMessageEndpoint));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException exception) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleException(Exception exception, HttpServletRequest request) {
        if (isMcpProtocolRequest(request)) {
            // Spring AI has its own JSON-RPC error handling for these two paths.
            // Re-throw the original exception so the container/Spring AI handles it.
            log.error("Unhandled exception in MCP protocol endpoint: ", exception);
            if (exception instanceof RuntimeException re) throw re;
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
