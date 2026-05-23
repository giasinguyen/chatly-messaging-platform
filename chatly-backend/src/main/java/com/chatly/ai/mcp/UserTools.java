package com.chatly.ai.mcp;

import com.chatly.dto.response.UserResponse;
import com.chatly.exception.AppException;
import com.chatly.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserTools {

    private final UserService userService;

    @Tool(description = "Get one user profile by user id. Returns limited profile when block policy applies.")
    public UserResponse getUserInfo(
            @ToolParam(description = "Target user id in UUID format") String userId
    ) {
        log.info("MCP tool invoked: get_user_info userId={} requester={}", userId, McpToolBase.getCurrentUserId());
        try {
            return userService.getById(UUID.fromString(userId));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid user_id format");
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Get the current authenticated user's own profile, including username, displayName, email, and status.")
    public UserResponse getMyProfile() {
        log.info("MCP tool invoked: get_my_profile requester={}", McpToolBase.getCurrentUserId());
        try {
            return userService.getCurrentUser();
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }
}
