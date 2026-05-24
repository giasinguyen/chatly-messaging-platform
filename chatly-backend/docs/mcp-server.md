# Chatly Backend MCP Server

Chatly Backend exposes a Spring AI MCP server so `chatly-agent` can use Chatly platform capabilities as typed tools. The MCP server is internal-only and runs inside the same Spring Boot application as the REST and WebSocket backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Protocol Endpoints](#protocol-endpoints)
3. [Authentication](#authentication)
4. [Configuration](#configuration)
5. [Tool Registry](#tool-registry)
6. [Skill Resources](#skill-resources)
7. [Agent Integration](#agent-integration)
8. [Security Rules](#security-rules)
9. [Tool Reference](#tool-reference)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The backend MCP server is implemented with `spring-ai-starter-mcp-server-webmvc` and tool beans under:

```text
src/main/java/com/chatly/ai/mcp/
```

It gives `chatly-agent` controlled access to:

- Current user profile and selected user profile data.
- Conversations and group metadata.
- Recent messages, time-range message reads, and keyword search.
- Group reminders, notes, members, and polls.
- Sending text or AI-marked messages into conversations.
- Social post context and AI-generated social comments.
- Skill resources that describe agent workflows and guardrails.

The MCP server is not a replacement for public REST APIs. It is an internal AI tool surface for the agent.

---

## Protocol Endpoints

Spring AI exposes the protocol endpoints configured in `application-dev.yml` and `application-prod.yml`.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/ai/mcp/sse` | Open MCP SSE session |
| `POST` | `/api/ai/mcp/message` | Send MCP protocol messages for the session |

These endpoints are separate from the user-facing AI MCP server management proxy:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/ai/mcp/servers` | JWT-protected proxy to `chatly-agent` user MCP registration |
| `GET` | `/api/ai/mcp/servers` | List user-owned MCP servers |
| `GET` | `/api/ai/mcp/servers/{serverId}` | Get one user-owned server |
| `PATCH` | `/api/ai/mcp/servers/{serverId}/toggle` | Enable or disable user-owned server |
| `DELETE` | `/api/ai/mcp/servers/{serverId}` | Delete user-owned server |
| `GET` | `/api/ai/mcp/servers/{serverId}/tools` | Live-fetch tools from a user-owned server |

Only `/api/ai/mcp/sse` and `/api/ai/mcp/message` are handled by Spring AI MCP.

---

## Authentication

`McpSecurityInterceptor` is a `OncePerRequestFilter` that intercepts only the two Spring AI MCP protocol endpoints.

Every MCP protocol request must include:

```http
X-Internal-API-Key: <app.mcp.internal-api-key>
X-User-Id: <user id>
```

Behavior:

- Missing or invalid `X-Internal-API-Key` returns `403`.
- Missing `X-User-Id` returns `400`.
- On success, the filter stores `X-User-Id` as the Spring Security principal.
- MCP tools call `McpToolBase.getCurrentUserId()` to resolve the user context.

Example:

```bash
curl -N http://localhost:8080/api/ai/mcp/sse \
  -H "X-Internal-API-Key: $APP_MCP_INTERNAL_API_KEY" \
  -H "X-User-Id: $USER_ID"
```

The `chatly-agent` `SystemMCPService` uses the same headers when `CHATLY_BACKEND_MCP_URL` is configured.

---

## Configuration

```yaml
spring:
  ai:
    mcp:
      server:
        enabled: ${SPRING_AI_MCP_ENABLED:true}
        name: ${SPRING_AI_MCP_SERVER_NAME:chatly-backend-mcp}
        version: ${SPRING_AI_MCP_SERVER_VERSION:0.0.1}
        instructions: "This server provides Chatly system tools."
        sse-endpoint: ${SPRING_AI_MCP_SSE_ENDPOINT:/api/ai/mcp/sse}
        sse-message-endpoint: ${SPRING_AI_MCP_SSE_MESSAGE_ENDPOINT:/api/ai/mcp/message}
        capabilities:
          tool: true
          resource: true
          prompt: true
          completion: true

app:
  mcp:
    internal-api-key: ${APP_MCP_INTERNAL_API_KEY:${AGENT_API_KEY:change-me-use-a-long-random-string-min-32-chars}}
```

Important variables:

| Variable | Description |
|---|---|
| `SPRING_AI_MCP_ENABLED` | Enables/disables the MCP server |
| `SPRING_AI_MCP_SERVER_NAME` | MCP server name |
| `SPRING_AI_MCP_SERVER_VERSION` | MCP server version |
| `SPRING_AI_MCP_SSE_ENDPOINT` | SSE endpoint path |
| `SPRING_AI_MCP_SSE_MESSAGE_ENDPOINT` | Message endpoint path |
| `APP_MCP_INTERNAL_API_KEY` | Secret expected in `X-Internal-API-Key` |

On startup, `McpStartupLogger` logs the enabled status and endpoint paths.

---

## Tool Registry

Spring discovers tools from beans with methods annotated by `org.springframework.ai.tool.annotation.Tool`.

| Class | Tools |
|---|---|
| `UserTools` | `getUserInfo`, `getMyProfile` |
| `ConversationTools` | `getMyConversations`, `getConversationInfo` |
| `MessageTools` | `readRecentMessages`, `readMessagesByTimeRange`, `searchMessages`, `sendTextMessage`, `sendAiMessage` |
| `GroupTools` | `getGroupMembers`, `getGroupInfo`, `listGroupNotes` |
| `ReminderTools` | `listGroupReminders`, `createGroupReminder` |
| `PollTools` | `createGroupPoll` |
| `SocialPostTools` | `getPostContext`, `getPostComments`, `createAiPostComment` |

Tool names are the Java method names exposed by Spring AI. Use camelCase names when referencing tools in prompts or agent logic.

---

## Skill Resources

`McpSkillResources` exposes workflow documents as MCP resources:

| URI | File |
|---|---|
| `chatly://skills/conversation-analyst` | `src/main/resources/skills/conversation-analyst.md` |
| `chatly://skills/reminder-detector` | `src/main/resources/skills/reminder-detector.md` |
| `chatly://skills/group-facilitator` | `src/main/resources/skills/group-facilitator.md` |
| `chatly://skills/social-comment-mentor` | `src/main/resources/skills/social-comment-mentor.md` |

`chatly-agent` reads all `chatly://skills/*` resources, concatenates their Markdown content, and injects it into the runtime system context. This keeps tools and their operating instructions versioned in the same backend deploy.

---

## Agent Integration

In `chatly-agent`, configure:

```bash
CHATLY_BACKEND_MCP_URL=http://localhost:8080/api/ai/mcp/sse
INTERNAL_API_KEY=<same value as backend APP_MCP_INTERNAL_API_KEY>
```

For Docker or service discovery, point `CHATLY_BACKEND_MCP_URL` at the backend service hostname, for example:

```bash
CHATLY_BACKEND_MCP_URL=http://chatly-backend:8080/api/ai/mcp/sse
```

Agent-side flow:

1. `SystemMCPService` creates an MCP SSE client for the current user.
2. It sends `X-Internal-API-Key` and `X-User-Id`.
3. It fetches backend tools and wraps them as LangChain tools.
4. It fetches `chatly://skills/*` resources and caches them for prompt context.
5. `ToolService` includes system MCP tools in every chat request when the backend MCP URL is configured.

The backend also calls `chatly-agent` through `AgentProxyClient` for user-facing AI session/chat/file routes and background triggers. That direction uses:

```http
X-API-Key: <agent.api-key>
X-User-Id: <authenticated user id>
```

Do not confuse agent proxy auth (`X-API-Key`) with backend MCP protocol auth (`X-Internal-API-Key`).

---

## Security Rules

- MCP tools must operate in the current user context from `X-User-Id`.
- Read tools must call services that enforce conversation membership and visibility.
- Write tools should be explicit and limited. Current write-capable tools are:
  - `sendTextMessage`
  - `sendAiMessage`
  - `createGroupReminder`
  - `createGroupPoll`
  - `createAiPostComment`
- Do not log message content, emails, phone numbers, tokens, or API keys.
- Tool exceptions should avoid leaking internal stack traces. `McpToolBase.toToolException()` maps `AppException` to a tool-safe exception message.
- Keep `APP_MCP_INTERNAL_API_KEY` secret and long enough for production use.

---

## Tool Reference

### UserTools

#### `getUserInfo(userId)`

Returns a `UserResponse` for a target user ID.

Input:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Notes:

- `userId` must be a UUID string.
- Invalid UUIDs raise `IllegalArgumentException`.

#### `getMyProfile()`

Returns the current user's profile from the MCP security context.

Input:

```json
{}
```

### ConversationTools

#### `getMyConversations()`

Returns all conversations the current user belongs to. Use this to resolve group names or partial names before calling group/message tools.

Input:

```json
{}
```

#### `getConversationInfo(conversationId)`

Returns conversation metadata, participants, and settings such as `requireApproval` and `aiProactiveEnabled`.

Input:

```json
{
  "conversationId": "conversation-id"
}
```

### MessageTools

#### `readRecentMessages(conversationId, limit)`

Reads recent messages from a conversation, newest first.

Input:

```json
{
  "conversationId": "conversation-id",
  "limit": 20
}
```

Limits:

- Default: `20`
- Clamped to `1..50`

#### `readMessagesByTimeRange(conversationId, from, to)`

Reads messages ordered oldest-first within an ISO-8601 time range.

Input:

```json
{
  "conversationId": "conversation-id",
  "from": "2026-05-01T00:00:00Z",
  "to": "2026-05-02T00:00:00Z"
}
```

Rules:

- Both timestamps are required.
- `from` must be before `to`.
- Maximum range is 30 days.
- Service returns at most 100 messages.

#### `searchMessages(conversationId, keyword)`

Searches message content in a conversation.

Input:

```json
{
  "conversationId": "conversation-id",
  "keyword": "meeting"
}
```

Returns up to 20 matches.

#### `sendTextMessage(conversationId, content)`

Sends a normal text message as the current user.

Input:

```json
{
  "conversationId": "conversation-id",
  "content": "Good morning everyone."
}
```

#### `sendAiMessage(conversationId, content)`

Sends an AI-generated response message to a group conversation. Use this for group `@AI` mention replies instead of `sendTextMessage`.

Input:

```json
{
  "conversationId": "conversation-id",
  "content": "Here is the summary..."
}
```

### GroupTools

#### `getGroupMembers(conversationId)`

Returns group members and roles.

Input:

```json
{
  "conversationId": "group-conversation-id"
}
```

#### `getGroupInfo(conversationId)`

Returns combined conversation metadata and group members.

Input:

```json
{
  "conversationId": "group-conversation-id"
}
```

#### `listGroupNotes(conversationId)`

Returns shared notes in a group conversation.

Input:

```json
{
  "conversationId": "group-conversation-id"
}
```

### ReminderTools

#### `listGroupReminders(conversationId)`

Lists reminders in a group conversation. Agents should call this before creating reminders to avoid duplicates.

Input:

```json
{
  "conversationId": "group-conversation-id"
}
```

#### `createGroupReminder(conversationId, title, description, remindAt)`

Creates a group reminder.

Input:

```json
{
  "conversationId": "group-conversation-id",
  "title": "Sprint planning",
  "description": "Prepare agenda",
  "remindAt": "2026-05-25T02:00:00Z"
}
```

Rules:

- `remindAt` is optional at the tool schema level but must be a valid ISO-8601 timestamp when provided.
- Business service validates reminder time and group permissions.

### PollTools

#### `createGroupPoll(conversationId, question, options, multipleChoice)`

Creates a poll message in a group conversation.

Input:

```json
{
  "conversationId": "group-conversation-id",
  "question": "Best time for standup?",
  "options": ["09:00", "10:00", "11:00"],
  "multipleChoice": false
}
```

Rules:

- At least two options are required.

### SocialPostTools

#### `getPostContext(postId)`

Returns social post content and metadata as formatted text.

Input:

```json
{
  "postId": "post-id"
}
```

#### `getPostComments(postId)`

Returns recent comments on a social post as formatted text.

Input:

```json
{
  "postId": "post-id"
}
```

#### `createAiPostComment(postId, content, triggerType, parentCommentId)`

Publishes an AI-generated comment on a social post.

Input:

```json
{
  "postId": "post-id",
  "content": "Helpful reply from Chatly AI.",
  "triggerType": "MENTION_IN_COMMENT",
  "parentCommentId": "comment-id"
}
```

Rules:

- `triggerType` should be `MENTION_IN_COMMENT` or `POST_COMMAND`.
- Omit or pass blank `parentCommentId` for a top-level AI comment.

---

## Troubleshooting

### Agent receives 403 from `/api/ai/mcp/sse`

Check that `X-Internal-API-Key` matches `app.mcp.internal-api-key`.

### Agent receives 400 from `/api/ai/mcp/sse`

The request is missing `X-User-Id`. The backend MCP server always requires user context.

### Tools are missing in the agent

Check:

- `SPRING_AI_MCP_ENABLED=true`
- Backend logs contain `MCP server ready`
- `CHATLY_BACKEND_MCP_URL` points to `/api/ai/mcp/sse`
- The agent can reach the backend network address

### Skill context is empty

Check backend logs for skill resource registration and confirm these classpath files exist:

- `skills/conversation-analyst.md`
- `skills/reminder-detector.md`
- `skills/group-facilitator.md`
- `skills/social-comment-mentor.md`

### Tool calls fail with permission errors

Most tools delegate to normal services, so the current `X-User-Id` must be a valid participant or authorized actor for the requested conversation, group, post, or user data.
