package com.chatly.ai.mcp;

import com.chatly.dto.request.MessageRequest;
import com.chatly.dto.response.MessageResponse;
import com.chatly.exception.AppException;
import com.chatly.model.enums.MessageType;
import com.chatly.model.mongo.Poll;
import com.chatly.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PollTools {

    private final MessageService messageService;

    @Tool(description = "Create a poll message in a group conversation. Requires at least 2 options.")
    public MessageResponse createGroupPoll(
            @ToolParam(description = "Conversation id") String conversationId,
            @ToolParam(description = "Poll question") String question,
            @ToolParam(description = "List of poll options (minimum 2)") List<String> options,
            @ToolParam(description = "Allow multiple choices per voter", required = false) Boolean multipleChoice
    ) {
        log.info("MCP tool invoked: create_group_poll conversationId={} question='{}' requester={}", conversationId, question, McpToolBase.getCurrentUserId());
        if (options == null || options.size() < McpToolBase.MIN_POLL_OPTIONS) {
            throw new IllegalArgumentException("Poll requires at least two options");
        }
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
            return messageService.send(McpToolBase.getCurrentUserId(), request);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }
}
