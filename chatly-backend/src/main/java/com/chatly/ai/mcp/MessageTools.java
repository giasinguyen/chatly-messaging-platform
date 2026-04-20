package com.chatly.ai.mcp;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.exception.AppException;
import com.chatly.model.enums.MessageType;
import com.chatly.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MessageTools {

    private final MessageService messageService;

    @Tool(description = "Read recent messages from a conversation, newest first. Limit is clamped to 1..50.")
    public List<MessageResponse> readRecentMessages(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Number of recent messages to return (default 20, max 50)", required = false) Integer limit
    ) {
        int size = McpToolBase.normalizeLimit(limit);
        log.info("MCP tool invoked: read_recent_messages conversationId={} limit={} requester={}", conversationId, size, McpToolBase.getCurrentUserId());
        try {
            return messageService.getByConversation(conversationId, McpToolBase.getCurrentUserId(), 0, size);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Read messages from a conversation within a time range, ordered oldest-first. Returns at most 100 messages. Max range is 30 days. Use this for catch-me-up and conversation summaries.")
    public List<MessageResponse> readMessagesByTimeRange(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Start time in ISO-8601, e.g. 2025-01-01T00:00:00Z") String from,
            @ToolParam(description = "End time in ISO-8601, e.g. 2025-01-08T00:00:00Z") String to
    ) {
        Instant fromInstant = McpToolBase.parseInstant(from);
        Instant toInstant = McpToolBase.parseInstant(to);
        if (fromInstant == null || toInstant == null) {
            throw new IllegalArgumentException("Both 'from' and 'to' timestamps are required");
        }
        if (fromInstant.isAfter(toInstant)) {
            throw new IllegalArgumentException("'from' must be before 'to'");
        }
        if (Duration.between(fromInstant, toInstant).toDays() > McpToolBase.MAX_TIME_RANGE_DAYS) {
            throw new IllegalArgumentException("Time range must not exceed " + McpToolBase.MAX_TIME_RANGE_DAYS + " days");
        }
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: read_messages_by_time_range conversationId={} from={} to={} requester={}", conversationId, from, to, userId);
        try {
            return messageService.getByConversationAndTimeRange(conversationId, userId, fromInstant, toInstant);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Search messages in a conversation by keyword. Returns up to 20 matching messages.")
    public List<MessageResponse> searchMessages(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Keyword to search for") String keyword
    ) {
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: search_messages conversationId={} keyword='{}' requester={}", conversationId, keyword, userId);
        try {
            return messageService.search(conversationId, userId, keyword, 0, McpToolBase.DEFAULT_MESSAGE_LIMIT);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Send a text message to a conversation as the current user.")
    public MessageResponse sendTextMessage(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Message content") String content
    ) {
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: send_text_message conversationId={} requester={}", conversationId, userId);
        MessageRequest request = MessageRequest.builder()
                .conversationId(conversationId)
                .content(content)
                .type(MessageType.TEXT)
                .build();
        try {
            return messageService.send(userId, request);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }
}
