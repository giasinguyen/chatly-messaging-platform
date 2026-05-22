package com.chatly.ai.mcp;

import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/**
 * Exposes Chatly skill definition files as MCP Resources.
 *
 * Skills are co-located with the MCP tools they describe — a single backend
 * deploy updates both tools and skill docs, preventing the two from drifting.
 *
 * Resources:
 *   chatly://skills/conversation-analyst
 *   chatly://skills/reminder-detector
 *   chatly://skills/group-facilitator
 */
@Configuration
@Slf4j
public class McpSkillResources {

    private static final String[][] SKILL_DEFS = {
        {
            "chatly://skills/conversation-analyst",
            "Conversation Analyst Skill",
            "Workflow for summarizing conversations and catch-me-up requests",
            "skills/conversation-analyst.md"
        },
        {
            "chatly://skills/reminder-detector",
            "Reminder Detector Skill",
            "Workflow for detecting and creating reminders from message content",
            "skills/reminder-detector.md"
        },
        {
            "chatly://skills/group-facilitator",
            "Group Facilitator Skill",
            "Workflow and guards for AI broadcasting into group conversations",
            "skills/group-facilitator.md"
        },
        {
            "chatly://skills/social-comment-mentor",
            "Social Comment Mentor Skill",
            "Workflow and guardrails for AI mention-in-comment and post-command on the social feed",
            "skills/social-comment-mentor.md"
        },
    };

    @Bean
    public List<McpServerFeatures.SyncResourceSpecification> skillResourceSpecifications() {
        List<McpServerFeatures.SyncResourceSpecification> specs = Arrays.stream(SKILL_DEFS)
            .map(def -> {
                String uri = def[0];
                String name = def[1];
                String description = def[2];
                String classpathPath = def[3];
                String content = readClasspath(classpathPath);
                McpSchema.Resource resource = new McpSchema.Resource(uri, name, description, "text/markdown", null);
                return new McpServerFeatures.SyncResourceSpecification(
                    resource,
                    (exchange, request) -> new McpSchema.ReadResourceResult(
                        List.of(new McpSchema.TextResourceContents(uri, "text/markdown", content))
                    )
                );
            })
            .toList();
        log.info("MCP skill resources registered: conversation-analyst, reminder-detector, group-facilitator, social-comment-mentor");
        return specs;
    }

    private static String readClasspath(String path) {
        try {
            return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load MCP skill resource: " + path, ex);
        }
    }
}
