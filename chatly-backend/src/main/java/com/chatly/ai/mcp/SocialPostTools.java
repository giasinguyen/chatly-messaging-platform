package com.chatly.ai.mcp;

import com.chatly.exception.AppException;
import com.chatly.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * MCP tools exposing social post data and AI comment creation to the agent.
 *
 * Tools:
 *   - getPostContext       : returns post content + metadata as a text summary
 *   - getPostComments      : returns recent comments on a post as text
 *   - createAiPostComment  : persists an AI-generated comment on a post
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SocialPostTools {

    private final PostService postService;

    @Tool(description = "Get the content and metadata of a social post for AI context. Returns post author, content, and hashtags.")
    public String getPostContext(
            @ToolParam(description = "The post ID to retrieve context for") String postId
    ) {
        log.info("MCP tool invoked: getPostContext postId={}", postId);
        try {
            return postService.buildPostContextForAi(postId);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Get the most recent comments on a social post as a formatted text list. Useful to understand discussion context before replying.")
    public String getPostComments(
            @ToolParam(description = "The post ID to retrieve comments for") String postId
    ) {
        log.info("MCP tool invoked: getPostComments postId={}", postId);
        try {
            return postService.buildPostCommentsContextForAi(postId);
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }

    @Tool(description = "Publish an AI-generated comment on a social post. Use this as the final step after composing your response. Set parentCommentId to reply to a specific comment, or leave it null to comment on the post itself.")
    public String createAiPostComment(
            @ToolParam(description = "The post ID to comment on") String postId,
            @ToolParam(description = "The comment text to publish") String content,
            @ToolParam(description = "Trigger type: MENTION_IN_COMMENT or POST_COMMAND") String triggerType,
            @ToolParam(description = "Optional parent comment ID if this is a reply; omit for top-level comment", required = false) String parentCommentId
    ) {
        log.info("MCP tool invoked: createAiPostComment postId={} triggerType={} parentCommentId={}", postId, triggerType, parentCommentId);
        try {
            String resolvedParentId = (parentCommentId == null || parentCommentId.isBlank()) ? null : parentCommentId;
            postService.addAiComment(postId, content, resolvedParentId, triggerType);
            return "AI comment published successfully on post " + postId;
        } catch (AppException ex) {
            throw McpToolBase.toToolException(ex);
        }
    }
}
