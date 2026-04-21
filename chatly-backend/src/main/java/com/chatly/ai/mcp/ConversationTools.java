package com.chatly.ai.mcp;

import com.chatly.dto.response.ConversationResponse;
import com.chatly.exception.AppException;
import com.chatly.service.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ConversationTools {

    private final ConversationService conversationService;

    @Tool(description = "Get all conversations the current user belongs to (DMs and groups). Use this to resolve a group name or partial name to its conversation ID before performing other actions.")
    public List<ConversationResponse> getMyConversations() {
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: get_my_conversations requester={}", userId);
        try {
            return conversationService.getByUserId(userId);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Get metadata for a single conversation: type (DM or GROUP), name, avatar, participant list, and settings (requireApproval, aiProactiveEnabled).")
    public ConversationResponse getConversationInfo(
            @ToolParam(description = "Conversation id") String conversationId
    ) {
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: get_conversation_info conversationId={} requester={}", conversationId, userId);
        try {
            return conversationService.getById(conversationId, userId);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }
}
