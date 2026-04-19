package com.chatly.ai.mcp;

import com.chatly.dto.request.GroupReminderRequest;
import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.GroupMemberResponse;
import com.chatly.dto.response.GroupReminderResponse;
import com.chatly.dto.response.MessageResponse;
import com.chatly.dto.response.UserResponse;
import com.chatly.exception.AppException;
import com.chatly.exception.ErrorCode;
import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Poll;
import com.chatly.service.GroupService;
import com.chatly.service.MessageService;
import com.chatly.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatlyMcpTools {

    private static final int DEFAULT_MESSAGE_LIMIT = 20;
    private static final int MAX_MESSAGE_LIMIT = 50;
    private static final int MIN_POLL_OPTIONS = 2;

    private final UserService userService;
    private final GroupService groupService;
    private final MessageService messageService;

    @Tool(description = "Get one user profile by user id. Returns limited profile when block policy applies.")
    public UserResponse getUserInfo(
            @ToolParam(description = "Target user id in UUID format") String userId
    ) {
        log.info("MCP tool invoked: get_user_info userId={} requester={}", userId, getCurrentUserId());
        try {
            return userService.getById(UUID.fromString(userId));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid user_id format");
        } catch (AppException ex) {
            throw toToolException(ex);
        }
    }

    @Tool(description = "Get group member list and roles for a conversation.")
    public List<GroupMemberResponse> getGroupMembers(
            @ToolParam(description = "Group conversation id") String conversationId
    ) {
        log.info("MCP tool invoked: get_group_members conversationId={} requester={}", conversationId, getCurrentUserId());
        try {
            return groupService.getMembers(conversationId, getCurrentUserId());
        } catch (AppException ex) {
            throw toToolException(ex);
        }
    }

    @Tool(description = "Read recent messages from a conversation. Limit is clamped to 1..50.")
    public List<MessageResponse> readRecentMessages(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Number of recent messages", required = false) Integer limit
    ) {
        int size = normalizeLimit(limit);
        log.info("MCP tool invoked: read_recent_messages conversationId={} limit={} requester={}", conversationId, size, getCurrentUserId());
        try {
            return messageService.getByConversation(conversationId, getCurrentUserId(), 0, size);
        } catch (AppException ex) {
            throw toToolException(ex);
        }
    }

    @Tool(description = "Send a text message to a conversation as the current user.")
    public MessageResponse sendTextMessage(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Message content") String content
    ) {
        log.info("MCP tool invoked: send_text_message conversationId={} requester={}", conversationId, getCurrentUserId());
        MessageRequest request = MessageRequest.builder()
                .conversationId(conversationId)
                .content(content)
                .type(MessageType.TEXT)
                .build();
        try {
            return messageService.send(getCurrentUserId(), request);
        } catch (AppException ex) {
            throw toToolException(ex);
        }
    }

    @Tool(description = "Create a group reminder. remindAt must be ISO-8601 and in the future.")
    public GroupReminderResponse createGroupReminder(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Reminder title") String title,
            @ToolParam(description = "Reminder description", required = false) String description,
            @ToolParam(description = "Reminder time in ISO-8601", required = false) String remindAt
    ) {
        log.info("MCP tool invoked: create_group_reminder conversationId={} title='{}' requester={}", conversationId, title, getCurrentUserId());
        GroupReminderRequest request = GroupReminderRequest.builder()
                .title(title)
                .description(description)
                .remindAt(parseInstant(remindAt))
                .build();
        try {
            return groupService.createReminder(conversationId, request, getCurrentUserId());
        } catch (AppException ex) {
            throw toToolException(ex);
        }
    }

    @Tool(description = "Create a poll message in a group conversation.")
    public MessageResponse createGroupPoll(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Poll question") String question,
            @ToolParam(description = "Poll options") List<String> options,
            @ToolParam(description = "Allow multiple choices", required = false) Boolean multipleChoice
    ) {
        log.info("MCP tool invoked: create_group_poll conversationId={} question='{}' requester={}", conversationId, question, getCurrentUserId());
        validatePollOptions(options);

        Poll poll = Poll.builder()
                .question(question)
                .options(options)
                .multipleChoice(Boolean.TRUE.equals(multipleChoice))
                .build();

        MessageRequest request = MessageRequest.builder()
                .conversationId(conversationId)
                .content(question)
                .type(MessageType.POLL)
                .poll(poll)
                .build();

        try {
            return messageService.send(getCurrentUserId(), request);
        } catch (AppException ex) {
            throw toToolException(ex);
        }
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            log.warn("MCP tool called with no authenticated user in SecurityContext");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return authentication.getPrincipal().toString();
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_MESSAGE_LIMIT;
        }
        return Math.max(1, Math.min(limit, MAX_MESSAGE_LIMIT));
    }

    private Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        try {
            return Instant.parse(raw);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("remindAt must be ISO-8601 format");
        }
    }

    private void validatePollOptions(List<String> options) {
        if (options == null || options.size() < MIN_POLL_OPTIONS) {
            throw new IllegalArgumentException("Poll requires at least two options");
        }
    }

    private RuntimeException toToolException(AppException ex) {
        log.warn("MCP tool failed: code={} message={}", ex.getErrorCode().getCode(), ex.getErrorCode().getMessage());
        return new IllegalStateException(ex.getErrorCode().getMessage());
    }
}
