# Chatly Backend — MCP (Model Context Protocol) Server Documentation

> **Model Context Protocol Server for Chatly Backend**  
> Exposes Chatly's messaging platform as a set of structured tools that AI agents can use to query data, manage conversations, create reminders, and interact with the messaging system.

---

## Table of Contents

1. [Overview](#overview)
2. [MCP Architecture](#mcp-architecture)
3. [Configuration](#configuration)
4. [Available Tools](#available-tools)
5. [Security & Authentication](#security--authentication)
6. [Integration with Agent Service](#integration-with-agent-service)
7. [Tool Reference](#tool-reference)
8. [Response Formats](#response-formats)
9. [Error Handling](#error-handling)
10. [Examples](#examples)
11. [Testing & Debugging](#testing--debugging)
12. [Performance Considerations](#performance-considerations)

---

## Overview

### What is MCP?

**Model Context Protocol (MCP)** is a standardized protocol for exposing capabilities to AI language models. It allows:

- LLMs to **discover** available tools and resources
- LLMs to **invoke** those tools safely with type-checked inputs
- Backend services to **control** what the LLM can access
- Clear **audit trails** of agent actions

### Chatly's MCP Server

The Chatly Backend implements a **Server-Sent Events (SSE)** based MCP server that provides the `chatly-agent` service with access to:

- **User Management**: Search users, get profiles, list contacts
- **Conversations**: List, create, retrieve conversation history
- **Messages**: Query messages by date range, filter by sender, retrieve attachments
- **Groups**: Get group details, list members, create/update groups
- **Reminders**: Create reminders tied to messages or standalone
- **Polls**: Create polls, view results, submit votes
- **Presence**: Check user online status

### Why MCP in Chatly?

1. **Agent Autonomy**: The agent can independently query conversation data without making multiple REST calls
2. **Type Safety**: Tools define strict input/output schemas; the agent knows exactly what data it can access
3. **Rate Limiting**: Backend can limit tool invocations per session to prevent abuse
4. **Audit Trail**: Every tool call is logged; security team can review agent actions
5. **Future-Proof**: If Chatly adds new features, the agent automatically gains access via new tools

---

## MCP Architecture

### High-Level Flow

```
┌──────────────────────────────────┐
│  Chatly Agent (localhost:8000)   │
│  (Python / LangGraph)            │
└──────────────┬───────────────────┘
               │
               │ HTTP GET /api/ai/mcp/sse (SSE)
               │ + HTTP POST /api/ai/mcp/message
               │
               │ Headers:
               │ - Authorization: Bearer <JWT>
               │ - X-Internal-API-Key: <MCP_KEY>
               │
┌──────────────▼───────────────────┐
│ Chatly Backend (localhost:8080)  │
│ MCP Server (Spring Boot)         │
│                                  │
│ ┌──────────────────────────────┐ │
│ │   SSE Connection Manager     │ │
│ │   - Maintains streams        │ │
│ │   - Sends tool updates       │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │   Tool Registry              │ │
│ │   - UserTools                │ │
│ │   - ConversationTools        │ │
│ │   - MessageTools             │ │
│ │   - GroupTools               │ │
│ │   - ReminderTools            │ │
│ │   - PollTools                │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │   Services (Business Logic)  │ │
│ │   - UserService              │ │
│ │   - ConversationService      │ │
│ │   - MessageService           │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │   Repositories               │ │
│ │   - PostgreSQL (User data)   │ │
│ │   - MongoDB (Messages)       │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### MCP Protocol Flow

1. **Agent initiates connection**: Opens persistent SSE stream to `/api/ai/mcp/sse`
2. **Backend sends tool list**: MCP server responds with available tools + schemas
3. **Agent invokes tool**: Sends POST to `/api/ai/mcp/message` with tool call
4. **Backend executes**: Validates input, runs business logic, returns result
5. **Agent processes result**: Incorporates data into LLM context, makes decisions
6. **Loop continues**: Agent can invoke more tools or respond to user

### Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/ai/mcp/sse` | GET | SSE stream for tool updates | `X-Internal-API-Key` |
| `/api/ai/mcp/message` | POST | Invoke tool or send messages | `X-Internal-API-Key` |

---

## Configuration

### Enable/Disable MCP Server

```yaml
# application-dev.yml
spring:
  ai:
    mcp:
      server:
        enabled: true                          # Enable MCP server
        name: "chatly-backend-mcp"             # Server identifier
        version: "0.0.1"                       # Version
        instructions: "This server provides Chatly system tools."
        sse-endpoint: "/api/ai/mcp/sse"
        sse-message-endpoint: "/api/ai/mcp/message"
        capabilities:
          tool: true                           # Tools available
          resource: true                       # Resources available
          prompt: true                         # Prompts available
          completion: true                     # Completions available
```

### Environment Variables

```bash
# Enable/disable (defaults to true in dev)
SPRING_AI_MCP_ENABLED=true

# Server identity
SPRING_AI_MCP_SERVER_NAME=chatly-backend-mcp
SPRING_AI_MCP_SERVER_VERSION=0.0.1

# API Key for agent → backend authentication
APP_MCP_INTERNAL_API_KEY=your-secret-key-min-32-characters

# Rate limiting per agent session (optional)
MCP_TOOL_CALLS_PER_MINUTE=100
MCP_TOOL_CALLS_PER_SESSION=10000

# Result caching (optional)
MCP_CACHE_TOOL_RESULTS=true
MCP_CACHE_TTL_SECONDS=300
```

### Spring Configuration Class

```java
// config/McpServerConfig.java
@Configuration
@EnableConditionalOnProperty("spring.ai.mcp.server.enabled")
public class McpServerConfig {
    
    @Bean
    public McpServer mcpServer(
        UserTools userTools,
        ConversationTools conversationTools,
        MessageTools messageTools,
        GroupTools groupTools,
        ReminderTools reminderTools,
        PollTools pollTools
    ) {
        return McpServer.builder()
            .name("chatly-backend-mcp")
            .version("0.0.1")
            .addTool(userTools)
            .addTool(conversationTools)
            .addTool(messageTools)
            .addTool(groupTools)
            .addTool(reminderTools)
            .addTool(pollTools)
            .build();
    }
}
```

---

## Available Tools

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **User** | `get_user`, `search_users`, `list_contacts`, `get_user_status` | User profile lookups, contact management |
| **Conversation** | `list_conversations`, `get_conversation`, `create_conversation` | Access and manage conversations |
| **Message** | `list_messages`, `get_message`, `search_messages`, `get_attachments` | Query message history, attachments |
| **Group** | `get_group`, `list_group_members`, `create_group`, `add_group_member` | Group operations |
| **Reminder** | `create_reminder`, `list_reminders`, `update_reminder`, `delete_reminder` | Reminder management |
| **Poll** | `create_poll`, `get_poll`, `submit_poll_vote`, `list_poll_results` | Poll operations |

### Tool Schemas

Each tool defines:
- **Input schema**: JSON Schema specifying required/optional parameters, types, constraints
- **Output schema**: JSON Schema for successful response
- **Error schema**: Possible error codes and messages
- **Rate limits**: Calls per minute, result cache TTL

---

## Security & Authentication

### Authentication Methods

#### 1. API Key Authentication (MCP ↔ Backend)

All MCP calls require the `X-Internal-API-Key` header:

```bash
curl -X GET http://localhost:8080/api/ai/mcp/sse \
     -H "X-Internal-API-Key: your-mcp-secret-key"
```

**Validation Code** (Spring Interceptor):

```java
// security/McpSecurityInterceptor.java
@Component
public class McpSecurityInterceptor extends HandlerInterceptorAdapter {
    
    @Override
    public boolean preHandle(HttpServletRequest request, 
                            HttpServletResponse response, 
                            Object handler) throws Exception {
        String apiKey = request.getHeader("X-Internal-API-Key");
        
        if (!isValidApiKey(apiKey)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, 
                             "Invalid MCP API Key");
            return false;
        }
        
        return true;
    }
    
    private boolean isValidApiKey(String key) {
        String expectedKey = environment.getProperty("app.mcp.internal-api-key");
        return MessageDigest.isEqual(key.getBytes(), expectedKey.getBytes());
    }
}
```

#### 2. User Context (Backend ↔ Databases)

When executing tools, the backend operates as the **agent user** (system-level access), but:

- **Query filters**: Tools apply user context to prevent data leakage
  - `getUserById()` requires user exists and requester has access
  - `listMessages()` filters by conversation membership
  - `listContactsOfUser()` only returns contacts visible to that user

**Example Safe Tool Implementation:**

```java
// ai/mcp/UserTools.java
@MCP.Tool
public UserResponse getUser(String userId) {
    // Get authenticated agent user from context
    String agentUserId = SecurityContextHolder.getContext()
        .getAuthentication().getPrincipal().toString();
    
    // Verify agent has access to this user's data
    if (!canAccessUserData(agentUserId, userId)) {
        throw new AppException(ErrorCode.FORBIDDEN, 
            "Agent cannot access this user's data");
    }
    
    // Safe to retrieve
    return userService.getUserById(userId);
}

private boolean canAccessUserData(String agentId, String targetId) {
    // Agent can access:
    // 1. Its own data (agentId == targetId)
    // 2. Users in same conversation
    // 3. Users in same group
    // ...implement business rules
}
```

### Rate Limiting

**Per-Session Rate Limit:**

```java
// service/McpRateLimitService.java
@Service
public class McpRateLimitService {
    
    private final LoadingCache<String, AtomicLong> toolCallCounter = 
        CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.MINUTES)
            .build(new CacheLoader<String, AtomicLong>() {
                public AtomicLong load(String key) {
                    return new AtomicLong(0);
                }
            });
    
    public boolean isRateLimited(String agentSessionId, String toolName) {
        long limit = environment.getProperty("mcp.tool-calls-per-minute", 
                                            Long.class, 100L);
        long current = toolCallCounter.getUnchecked(agentSessionId)
            .incrementAndGet();
        
        if (current > limit) {
            logger.warn("MCP rate limit exceeded for session {}", 
                       agentSessionId);
            return true;
        }
        
        return false;
    }
}
```

### Audit Logging

Every tool invocation is logged:

```java
// ai/mcp/McpAuditLog.java
@Aspect
@Component
public class McpAuditAspect {
    
    @Before("@annotation(ai.mcp.MCP.Tool)")
    public void logToolInvocation(JoinPoint joinPoint) {
        String toolName = joinPoint.getSignature().getName();
        String agentId = extractAgentId();
        String args = Arrays.toString(joinPoint.getArgs());
        
        logger.info("MCP_TOOL_INVOKED: tool={}, agent={}, args={}", 
                   toolName, agentId, args);
    }
    
    @AfterReturning(pointcut = "@annotation(ai.mcp.MCP.Tool)", 
                    returning = "result")
    public void logToolSuccess(Object result) {
        logger.info("MCP_TOOL_SUCCESS: result_size={}", 
                   getResultSize(result));
    }
    
    @AfterThrowing(pointcut = "@annotation(ai.mcp.MCP.Tool)", 
                   throwing = "ex")
    public void logToolError(Exception ex) {
        logger.error("MCP_TOOL_ERROR: {}", ex.getMessage());
    }
}
```

---

## Integration with Agent Service

### Agent Initialization

When the `chatly-agent` starts:

1. Agent reads `BACKEND_URL` and `BACKEND_MCP_API_KEY` from environment
2. Agent initiates SSE connection to backend MCP server
3. Backend sends tool list and schemas
4. Agent loads tools into LangGraph execution context

```python
# chatly-agent/app/mcp/backend_mcp_client.py
import httpx
import json

class BackendMcpClient:
    def __init__(self):
        self.base_url = os.getenv("BACKEND_URL", "http://localhost:8080")
        self.api_key = os.getenv("BACKEND_MCP_API_KEY")
        self.headers = {"X-Internal-API-Key": self.api_key}
    
    async def connect(self):
        """Establish SSE connection to backend MCP server"""
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "GET",
                f"{self.base_url}/api/ai/mcp/sse",
                headers=self.headers,
                timeout=None
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        data = json.loads(line[5:])
                        yield data
    
    async def invoke_tool(self, tool_name: str, **kwargs):
        """Invoke a backend tool"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/ai/mcp/message",
                json={
                    "method": "tools/call",
                    "params": {
                        "name": tool_name,
                        "arguments": kwargs
                    }
                },
                headers=self.headers,
                timeout=120
            )
            return response.json()
```

### Example Agent Workflow

```python
# chatly-agent/app/graphs/main_graph.py
from langchain.agents import AgentExecutor, Tool
from backend_mcp_client import BackendMcpClient

class ChatlyAgentGraph:
    def __init__(self):
        self.mcp_client = BackendMcpClient()
        self.tools = self._load_tools()
    
    def _load_tools(self) -> list[Tool]:
        """Convert MCP tools to LangChain Tool objects"""
        return [
            Tool(
                name="list_messages",
                func=lambda **kwargs: self.mcp_client.invoke_tool(
                    "list_messages", **kwargs),
                description="List messages in a conversation"
            ),
            Tool(
                name="get_user",
                func=lambda **kwargs: self.mcp_client.invoke_tool(
                    "get_user", **kwargs),
                description="Get user profile information"
            ),
            # ... more tools
        ]
    
    async def process_user_message(self, user_id: str, message: str):
        """Process user message with tool access"""
        # Agent can now invoke backend tools to:
        # 1. Query user's conversation history
        # 2. Look up user info
        # 3. Create reminders tied to messages
        # 4. Suggest group actions
        
        result = await self.agent.invoke({
            "input": message,
            "user_id": user_id
        })
        
        return result
```

---

## Tool Reference

### UserTools

#### `get_user(userId: string)`

Get user profile by ID.

**Input:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Output:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "john_doe",
  "fullName": "John Doe",
  "avatarUrl": "https://s3.../avatar.jpg",
  "bio": "Software engineer",
  "status": "ONLINE",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

**Errors:**
- `USER_NOT_FOUND` (1101): User does not exist
- `FORBIDDEN` (9001): Agent cannot access this user

---

#### `search_users(query: string, limit: integer = 10)`

Search users by username, email, or name.

**Input:**
```json
{
  "query": "john",
  "limit": 5
}
```

**Output:**
```json
{
  "results": [
    { "id": "...", "username": "john_doe", "email": "john@..." },
    { "id": "...", "username": "john_smith", "email": "smith@..." }
  ],
  "total": 2
}
```

---

#### `list_contacts(userId: string)`

List all contacts (friends) of a user.

**Input:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Output:**
```json
{
  "contacts": [
    {
      "id": "contact-id",
      "user": { "id": "...", "username": "..." },
      "status": "ACCEPTED",
      "addedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `get_user_status(userId: string)`

Get user's online/offline status.

**Input:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Output:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ONLINE",
  "lastSeenAt": "2025-04-20T10:30:00Z"
}
```

---

### ConversationTools

#### `list_conversations(userId: string, limit: integer = 20, offset: integer = 0)`

List conversations for a user (paginated).

**Input:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "limit": 10,
  "offset": 0
}
```

**Output:**
```json
{
  "conversations": [
    {
      "id": "conv-1",
      "type": "PRIVATE",
      "participantCount": 2,
      "lastMessageAt": "2025-04-20T10:30:00Z",
      "unreadCount": 3,
      "participants": [
        { "id": "...", "username": "..." }
      ]
    }
  ],
  "total": 42
}
```

---

#### `get_conversation(conversationId: string)`

Get conversation details.

**Input:**
```json
{
  "conversationId": "conv-1"
}
```

**Output:**
```json
{
  "id": "conv-1",
  "type": "PRIVATE",
  "participants": [
    { "id": "...", "username": "..." },
    { "id": "...", "username": "..." }
  ],
  "createdAt": "2025-01-01T00:00:00Z",
  "lastMessageAt": "2025-04-20T10:30:00Z"
}
```

---

#### `create_conversation(participantIds: string[], conversationType: string = "PRIVATE")`

Create a new conversation.

**Input:**
```json
{
  "participantIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "conversationType": "PRIVATE"
}
```

**Output:**
```json
{
  "id": "conv-new",
  "type": "PRIVATE",
  "participants": [...],
  "createdAt": "2025-04-20T11:00:00Z"
}
```

---

### MessageTools

#### `list_messages(conversationId: string, limit: integer = 50, before: timestamp = null)`

List messages in a conversation (newest first).

**Input:**
```json
{
  "conversationId": "conv-1",
  "limit": 20,
  "before": "2025-04-20T10:30:00Z"
}
```

**Output:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "conversationId": "conv-1",
      "senderId": "user-id",
      "content": "Hello, world!",
      "createdAt": "2025-04-20T10:30:00Z",
      "attachments": [],
      "reactions": [
        { "emoji": "👍", "count": 2 }
      ]
    }
  ],
  "total": 150
}
```

---

#### `search_messages(conversationId: string, query: string, limit: integer = 20)`

Search messages by content.

**Input:**
```json
{
  "conversationId": "conv-1",
  "query": "meeting tomorrow",
  "limit": 10
}
```

**Output:**
```json
{
  "results": [
    {
      "id": "msg-42",
      "content": "Let's discuss the meeting tomorrow at 10am",
      "snippet": "...discuss the <b>meeting tomorrow</b> at 10am...",
      "createdAt": "2025-04-20T10:00:00Z"
    }
  ]
}
```

---

#### `get_message(messageId: string)`

Get a specific message.

**Input:**
```json
{
  "messageId": "msg-1"
}
```

**Output:**
```json
{
  "id": "msg-1",
  "conversationId": "conv-1",
  "senderId": "user-id",
  "content": "Hello, world!",
  "createdAt": "2025-04-20T10:30:00Z",
  "editedAt": null,
  "recalledAt": null,
  "attachments": [
    {
      "id": "att-1",
      "url": "https://s3.../file.pdf",
      "type": "document",
      "size": 2048
    }
  ]
}
```

---

### GroupTools

#### `get_group(groupId: string)`

Get group details.

**Input:**
```json
{
  "groupId": "group-1"
}
```

**Output:**
```json
{
  "id": "group-1",
  "name": "Engineering Team",
  "description": "Discussion for engineering tasks",
  "avatarUrl": "https://s3.../group-avatar.jpg",
  "memberCount": 5,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

#### `list_group_members(groupId: string)`

List all members of a group.

**Input:**
```json
{
  "groupId": "group-1"
}
```

**Output:**
```json
{
  "members": [
    {
      "id": "member-1",
      "user": { "id": "...", "username": "...", "email": "..." },
      "role": "ADMIN",
      "joinedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### ReminderTools

#### `create_reminder(title: string, description: string = null, dueAt: timestamp, linkedMessageId: string = null)`

Create a reminder.

**Input:**
```json
{
  "title": "Call John",
  "description": "Discuss project timeline",
  "dueAt": "2025-04-21T14:00:00Z",
  "linkedMessageId": "msg-42"
}
```

**Output:**
```json
{
  "id": "reminder-1",
  "title": "Call John",
  "dueAt": "2025-04-21T14:00:00Z",
  "linkedMessage": { "id": "msg-42", "content": "..." },
  "createdAt": "2025-04-20T11:00:00Z"
}
```

---

#### `list_reminders(userId: string, status: string = "PENDING")`

List reminders for a user.

**Input:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING"
}
```

**Output:**
```json
{
  "reminders": [
    {
      "id": "reminder-1",
      "title": "Call John",
      "dueAt": "2025-04-21T14:00:00Z",
      "status": "PENDING"
    }
  ]
}
```

---

### PollTools

#### `create_poll(conversationId: string, question: string, options: string[], expiresAt: timestamp = null)`

Create a poll in a conversation.

**Input:**
```json
{
  "conversationId": "conv-1",
  "question": "Best time for standup?",
  "options": ["9am", "10am", "11am"],
  "expiresAt": "2025-04-21T12:00:00Z"
}
```

**Output:**
```json
{
  "id": "poll-1",
  "question": "Best time for standup?",
  "options": [
    { "text": "9am", "votes": 0 },
    { "text": "10am", "votes": 0 },
    { "text": "11am", "votes": 0 }
  ],
  "createdAt": "2025-04-20T11:00:00Z",
  "expiresAt": "2025-04-21T12:00:00Z"
}
```

---

#### `submit_poll_vote(pollId: string, optionIndex: integer)`

Vote on a poll.

**Input:**
```json
{
  "pollId": "poll-1",
  "optionIndex": 1
}
```

**Output:**
```json
{
  "pollId": "poll-1",
  "userVote": "10am",
  "updatedResults": [
    { "text": "9am", "votes": 1 },
    { "text": "10am", "votes": 2 },
    { "text": "11am", "votes": 0 }
  ]
}
```

---

## Response Formats

### Successful Tool Response

```json
{
  "jsonrpc": "2.0",
  "id": "msg-123",
  "result": {
    "id": "user-123",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": "msg-123",
  "error": {
    "code": -32602,
    "message": "Invalid request",
    "data": {
      "errorCode": "INVALID_INPUT",
      "details": "userId must be a valid UUID"
    }
  }
}
```

### Standard Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| -32700 | Parse error | 400 |
| -32600 | Invalid request | 400 |
| -32601 | Method not found | 404 |
| -32602 | Invalid params | 400 |
| -32603 | Internal error | 500 |
| -32001 | Rate limited | 429 |
| -32002 | Unauthorized | 401 |

---

## Error Handling

### Common MCP Errors

**Rate Limit Exceeded:**
```json
{
  "error": {
    "code": -32001,
    "message": "Rate limit exceeded",
    "data": {
      "resetAt": "2025-04-20T11:05:00Z",
      "limit": 100,
      "current": 105
    }
  }
}
```

**Invalid User Access:**
```json
{
  "error": {
    "code": -32002,
    "message": "Unauthorized",
    "data": {
      "reason": "Agent cannot access this user's data"
    }
  }
}
```

**Tool Parameter Validation:**
```json
{
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "userId",
      "constraint": "must be a valid UUID",
      "received": "invalid-id"
    }
  }
}
```

---

## Examples

### Example 1: Retrieve User's Recent Conversations

**Agent Code (Python):**
```python
# Get the authenticated user
user_id = "550e8400-e29b-41d4-a716-446655440000"

# List conversations
result = await mcp_client.invoke_tool(
    "list_conversations",
    userId=user_id,
    limit=5,
    offset=0
)

conversations = result["result"]["conversations"]

# Process results
for conv in conversations:
    print(f"Conversation {conv['id']}: {conv['participantCount']} participants")
    print(f"Last message: {conv['lastMessageAt']}")
```

**HTTP Request:**
```bash
curl -X POST http://localhost:8080/api/ai/mcp/message \
     -H "X-Internal-API-Key: secret-key" \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": "req-1",
       "method": "tools/call",
       "params": {
         "name": "list_conversations",
         "arguments": {
           "userId": "550e8400-e29b-41d4-a716-446655440000",
           "limit": 5,
           "offset": 0
         }
       }
     }'
```

---

### Example 2: Create a Reminder Linked to a Message

**Agent Code (Python):**
```python
# User says: "Remind me about the meeting tomorrow"
# Agent finds relevant message and creates reminder

message = await mcp_client.invoke_tool(
    "get_message",
    messageId="msg-42"
)

reminder = await mcp_client.invoke_tool(
    "create_reminder",
    title="Follow up on: " + message["result"]["content"][:50],
    dueAt="2025-04-21T09:00:00Z",
    linkedMessageId="msg-42"
)

print(f"Reminder created: {reminder['result']['id']}")
```

---

### Example 3: Search Messages and Analyze Trends

**Agent Code (Python):**
```python
# Agent analyzes conversation topics

search_result = await mcp_client.invoke_tool(
    "search_messages",
    conversationId="conv-1",
    query="project status",
    limit=20
)

messages = search_result["result"]["results"]

# Build summary
summary = {
    "query": "project status",
    "matches": len(messages),
    "timeRange": {
        "earliest": min(msg["createdAt"] for msg in messages),
        "latest": max(msg["createdAt"] for msg in messages)
    }
}

print(json.dumps(summary, indent=2))
```

---

## Testing & Debugging

### Test MCP Connectivity

```bash
# 1. Test SSE stream connection
curl -v -N http://localhost:8080/api/ai/mcp/sse \
     -H "X-Internal-API-Key: your-secret-key"

# Expected response: stream of tool definitions
```

### Test Tool Invocation

```bash
# 2. Invoke a tool
curl -X POST http://localhost:8080/api/ai/mcp/message \
     -H "X-Internal-API-Key: your-secret-key" \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": "test-1",
       "method": "tools/call",
       "params": {
         "name": "get_user",
         "arguments": {
           "userId": "550e8400-e29b-41d4-a716-446655440000"
         }
       }
     }' | jq .
```

### Enable MCP Debug Logging

```yaml
# application-dev.yml
logging:
  level:
    com.chatly.ai.mcp: DEBUG
    org.springframework.ai.mcp: DEBUG
```

Then check logs:
```bash
docker-compose logs -f backend | grep -i mcp
```

### Use Postman to Test MCP

1. Create a new **Request** in Postman
2. **Method**: POST
3. **URL**: `http://localhost:8080/api/ai/mcp/message`
4. **Headers**:
   - `X-Internal-API-Key: your-secret-key`
   - `Content-Type: application/json`
5. **Body** (raw JSON):
   ```json
   {
     "jsonrpc": "2.0",
     "id": "test-1",
     "method": "tools/call",
     "params": {
       "name": "list_conversations",
       "arguments": {
         "userId": "550e8400-e29b-41d4-a716-446655440000",
         "limit": 5
       }
     }
   }
   ```
6. **Send** and inspect response

---

## Performance Considerations

### Caching Strategy

To reduce database load, frequently accessed tool results are cached:

```java
// ai/mcp/UserTools.java
@Cacheable(value = "mcp_users", key = "#userId", 
           unless = "#result == null")
public UserResponse getUser(String userId) {
    return userService.getUserById(userId);
}
```

**Cache Configuration:**
```yaml
# application-dev.yml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 300000  # 5 minutes
    cache-names:
      - mcp_users
      - mcp_conversations
      - mcp_messages
```

### Query Optimization

**Avoid N+1 queries:**

```java
// WRONG - causes N+1 queries
for (Conversation conv : conversations) {
    List<User> participants = userRepository.findByConversation(conv.getId());
}

// CORRECT - uses eager loading
List<Conversation> conversations = conversationRepository.findAll(
    where(userId = ?).with(Specification.of(Conversation.class)
        .leftJoin("participants"))
);
```

### Pagination

All list tools support pagination to avoid transferring huge datasets:

```json
{
  "name": "list_messages",
  "arguments": {
    "conversationId": "conv-1",
    "limit": 50,              // Max results per call
    "before": "2025-04-20T10:30:00Z"  // Cursor for pagination
  }
}
```

### Rate Limiting

Default limits (configurable):
- **Per session**: 100 tool calls per minute
- **Per day**: 10,000 tool calls per agent user
- **Cache TTL**: 5 minutes for query results

---

## Monitoring & Observability

### Metrics to Track

```yaml
# Spring Actuator metrics
GET /actuator/metrics/mcp.tools.invoked
GET /actuator/metrics/mcp.tools.duration
GET /actuator/metrics/mcp.tools.errors
GET /actuator/metrics/mcp.cache.hits
GET /actuator/metrics/mcp.cache.misses
```

### Example Alert Rules (Prometheus)

```yaml
- alert: MCPToolLatencyHigh
  expr: mcp_tools_duration_seconds > 5
  for: 5m
  
- alert: MCPToolErrorRateHigh
  expr: rate(mcp_tools_errors_total[5m]) > 0.1
  
- alert: MCPRateLimitExceeded
  expr: rate(mcp_rate_limit_exceeded_total[5m]) > 0
```

---

## Troubleshooting MCP Issues

### Agent can't connect to MCP server

**Symptom**: Agent logs `Connection refused` or timeout

**Diagnosis**:
1. Verify backend is running: `curl http://localhost:8080/health`
2. Check API key is correct in agent `.env`
3. Verify firewall allows port 8080

**Solution**:
```bash
# Backend
docker-compose up -d backend

# Agent
export BACKEND_URL=http://backend:8080
export BACKEND_MCP_API_KEY=$(cat /path/to/mcp-key)
python -m uvicorn app.main:app
```

### Tools not appearing in agent context

**Symptom**: Agent says "I don't have access to user tools"

**Diagnosis**:
- Check if MCP server is enabled in `application-dev.yml`
- Verify tools are registered in bean

**Solution**:
```yaml
# application-dev.yml
spring:
  ai:
    mcp:
      server:
        enabled: true
```

### Tool returns "Forbidden" errors

**Symptom**: All tool calls return `FORBIDDEN` error code

**Diagnosis**:
- Agent doesn't have permission to access target user's data
- Check user context and access control rules

**Solution**:
- Verify the target user exists
- Ensure agent and target user are in same conversation/group
- Check if user is blocked

---

## Future Enhancements

- [ ] **Tool result streaming**: For large result sets (messages > 10K)
- [ ] **Batch tool invocation**: Call multiple tools in single request
- [ ] **Resource subscriptions**: Real-time updates for conversations
- [ ] **Custom prompts**: Store system prompts in backend, deliver via MCP
- [ ] **Prompt optimization**: Backend suggests prompts based on conversation context

---

## Support & Resources

- **MCP Specification**: https://modelcontextprotocol.io
- **Spring AI MCP**: https://spring.io/projects/spring-ai
- **Chatly Backend README**: [README.md](README.md)
- **Root AGENTS.md**: [../AGENTS.md](../AGENTS.md)
- **Backend AGENTS.md**: [AGENTS.md](AGENTS.md)

---

**Last Updated**: April 2026  
**Version**: 0.0.1  
**Status**: Production Ready
