package com.chatly.ai.mcp;

import com.chatly.dto.response.GroupMemberResponse;
import com.chatly.dto.response.GroupNoteResponse;
import com.chatly.exception.AppException;
import com.chatly.service.ConversationService;
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
public class GroupTools {

    private final GroupService groupService;
    private final ConversationService conversationService;

    @Tool(description = "Get the member list and roles for a group conversation. Returns userId, displayName, and role (OWNER, ADMIN, MEMBER) for each member.")
    public List<GroupMemberResponse> getGroupMembers(
            @ToolParam(description = "Group conversation id") String conversationId
    ) {
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: get_group_members conversationId={} requester={}", conversationId, userId);
        try {
            return groupService.getMembers(conversationId, userId);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Get combined group info: conversation metadata (name, type, settings) plus full member list. Use before any group action to confirm context and aiProactiveEnabled status.")
    public GroupInfoResult getGroupInfo(
            @ToolParam(description = "Group conversation id") String conversationId
    ) {
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: get_group_info conversationId={} requester={}", conversationId, userId);
        try {
            var conversation = conversationService.getById(conversationId, userId);
            var members = groupService.getMembers(conversationId, userId);
            return new GroupInfoResult(conversation, members);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "List shared notes for a group conversation.")
    public List<GroupNoteResponse> listGroupNotes(
            @ToolParam(description = "Group conversation id") String conversationId
    ) {
        String userId = McpToolBase.getCurrentUserId();
        log.info("MCP tool invoked: list_group_notes conversationId={} requester={}", conversationId, userId);
        try {
            return groupService.getNotes(conversationId, userId);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    public record GroupInfoResult(
            com.chatly.dto.response.ConversationResponse conversation,
            List<GroupMemberResponse> members
    ) {}
}
