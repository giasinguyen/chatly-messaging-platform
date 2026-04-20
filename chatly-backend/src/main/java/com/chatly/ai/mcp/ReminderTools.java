package com.chatly.ai.mcp;

import com.chatly.dto.request.GroupReminderRequest;
import com.chatly.dto.response.GroupReminderResponse;
import com.chatly.exception.AppException;
import com.chatly.service.GroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderTools {

    private final GroupService groupService;

    @Tool(description = "List all reminders in a group conversation. Use this to check for existing reminders before creating a new one to avoid duplicates.")
    public List<GroupReminderResponse> listGroupReminders(
            @ToolParam(description = "Group conversation id") String conversationId
    ) {
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: list_group_reminders conversationId={} requester={}", conversationId, userId);
        try {
            return groupService.getReminders(conversationId, userId);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Create a group reminder. remindAt must be ISO-8601 and in the future. Always call listGroupReminders first to avoid creating duplicates.")
    public GroupReminderResponse createGroupReminder(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Reminder title") String title,
            @ToolParam(description = "Reminder description", required = false) String description,
            @ToolParam(description = "Reminder time in ISO-8601, e.g. 2025-01-01T09:00:00Z", required = false) String remindAt
    ) {
        log.info("MCP tool invoked: create_group_reminder conversationId={} title='{}' requester={}", conversationId, title, McpToolBase.getCurrentUserId());
        GroupReminderRequest request = GroupReminderRequest.builder()
                .title(title)
                .description(description)
                .remindAt(McpToolBase.parseInstant(remindAt))
                .build();
        try {
            return groupService.createReminder(conversationId, request, McpToolBase.getCurrentUserId());
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }
}
