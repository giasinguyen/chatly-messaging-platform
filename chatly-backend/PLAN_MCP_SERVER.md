# Plan: Implement Chatly Backend MCP Server (Aligned With Current Codebase)

This plan updates the original proposal to match the real architecture of `chatly-backend` and `chatly-agent`.

## 1. Goal

Add an MCP Server inside `chatly-backend` so `chatly-agent` can call backend-owned tools safely on behalf of authenticated users.

Key requirement:
- The design must work with the current `chatly-agent` MCP client first.
- SSE transport remains a target, but only after agent-side support is added.

## 2. Current Reality (Must Be Acknowledged)

1. `chatly-agent` currently uses JSON-RPC 2.0 over HTTP POST for MCP (`tools/list`, `tools/call`).
2. `chatly-backend` currently has MCP management proxy endpoints (`/api/ai/mcp/servers`) forwarding to `chatly-agent`, but no native Spring MCP server yet.
3. Therefore, enabling SSE transport only in backend will not be callable by agent without agent client changes.

## 3. Implementation Strategy

### Phase A (Required): Production-Compatible MCP via HTTP JSON-RPC

This phase delivers a working integration immediately.

#### A1. Dependencies and Bootstrapping
1. Update `pom.xml`:
    - Add Spring AI BOM.
    - Add Spring AI MCP server starter dependency.
2. Enable MCP server in the Spring Boot app setup as required by Spring AI version used.

#### A2. MCP Transport Configuration (HTTP first)
Configure MCP transport in backend profile files:
- `spring.ai.mcp.enabled: true`
- `spring.ai.mcp.transport.type: http`
- `spring.ai.mcp.transport.http.path: /api/ai/mcp`

Notes:
- Use the actual property namespace supported by the selected Spring AI version.
- Keep path stable so `chatly-agent` can register the backend MCP URL directly.

#### A3. Security Contract (Critical)
Introduce an internal auth layer for MCP endpoint calls from `chatly-agent`:
1. Validate service-to-service API key (for example `X-API-Key`).
2. Accept `X-User-Id` only after internal API key passes.
3. Build `Authentication` and populate `SecurityContextHolder` with that user id.
4. Restrict MCP endpoint access to internal traffic only.

Do not rely on plain `X-User-Id` without internal authentication.

#### A4. MCP Tools Implementation (`ChatlyMcpTools`)
Create a dedicated tool component and map tools to existing services with current method signatures.

Tool set:
1. `get_user_info(user_id)`
    - Call `userService.getById(UUID)`.
    - Behavior note: service may return limited profile when block rules apply.
2. `get_group_members(conversation_id)`
    - Use current user from `SecurityContextHolder`.
    - Call `groupService.getMembers(conversationId, requesterId)`.
3. `read_recent_messages(conversation_id, limit)`
    - Convert `limit` into existing paging model: `page=0`, `size=clamped(limit)`.
    - Call `messageService.getByConversation(conversationId, requesterId, 0, size)`.
4. `send_text_message(conversation_id, content)`
    - Build `MessageRequest` with `type=TEXT`.
    - Call `messageService.send(requesterId, request)`.
5. `create_group_reminder(conversation_id, title, description, remind_at)`
    - Build `GroupReminderRequest`.
    - Call `groupService.createReminder(conversationId, request, requesterId)`.
6. `create_group_poll(conversation_id, question, options, multiple_choice)`
    - Build `Poll` and `MessageRequest` with `type=POLL`.
    - Call `messageService.send(requesterId, request)`.

#### A5. Error Handling
For service exceptions:
- Catch `AppException` in the MCP tool boundary.
- Return structured, user-safe MCP error messages.
- Do not expose internal details, secrets, or stack traces.

#### A6. Integration Wiring From Agent
Register backend MCP URL in agent MCP server registry:
- Example URL: `http://chatly-backend:8080/api/ai/mcp`
- Include required internal headers configured by platform policy.

### Phase B (Optional): SSE Transport Upgrade

Only start this phase after Phase A is stable.

#### B1. Agent Prerequisite
Enhance `chatly-agent` MCP client to support SSE transport for MCP requests/responses.

#### B2. Backend Switch
After agent SSE client is validated:
- Change to `spring.ai.mcp.transport.type: sse`
- Keep a migration period where HTTP transport remains available behind a feature flag if needed.

#### B3. Backward Compatibility Plan
Define a rollback strategy:
- If SSE issues occur, switch back to HTTP transport without code rollback.

## 4. Security and Identity Rules

In each tool method, derive current user from security context established by the internal auth filter/interceptor:

```java
String currentUserId = SecurityContextHolder.getContext()
          .getAuthentication()
          .getPrincipal()
          .toString();
```

Rules:
1. Never trust tool input for requester identity.
2. Never allow overriding `currentUserId` by tool parameters.
3. Keep authorization checks inside existing service methods.

## 5. Testing Plan

### Unit Tests (backend)
1. `ChatlyMcpToolsTest`
    - Verify correct service calls per tool.
    - Verify request object mapping (`MessageRequest`, `GroupReminderRequest`, `Poll`).
2. `McpSecurityInterceptorTest` (or filter test)
    - Reject missing/invalid internal API key.
    - Reject missing `X-User-Id`.
    - Populate `SecurityContext` on success.

### Integration Tests
1. Backend MCP endpoint test:
    - `tools/list` returns expected tool metadata.
    - `tools/call` executes with authenticated user context.
2. Cross-service test with agent:
    - Agent registers backend MCP URL.
    - Agent can list tools and call at least one read + one write tool.

### SSE Tests (Phase B only)
1. Verify streaming handshake and event format.
2. Verify tool call success over SSE path.
3. Validate fallback to HTTP when SSE disabled.

## 6. Deliverables and File Changes

### Backend
1. `pom.xml`
    - Add Spring AI MCP dependencies.
2. `src/main/resources/application-dev.yml`
3. `src/main/resources/application-prod.yml`
    - Add MCP transport config (HTTP first, SSE later).
4. `src/main/java/com/chatly/ai/mcp/ChatlyMcpTools.java`
    - Implement MCP tool methods.
5. `src/main/java/com/chatly/security/McpSecurityInterceptor.java` (or equivalent filter)
    - Internal auth + security context population.
6. `src/test/java/.../ChatlyMcpToolsTest.java`
7. `src/test/java/.../McpSecurityInterceptorTest.java`

### Agent (for Phase B)
1. `app/services/mcp_service.py`
    - Add SSE-capable MCP client mode.
2. Agent tests for SSE mode.

## 7. Acceptance Criteria

Phase A is done when:
1. `chatly-agent` can register backend MCP endpoint and call `tools/list` successfully.
2. At least 4 backend tools execute successfully using user-scoped authorization.
3. Invalid internal API key is rejected.
4. Tool invocation cannot impersonate another user.

Phase B is done when:
1. Agent can call backend MCP via SSE in staging.
2. End-to-end chat flow with MCP tools works over SSE.
3. Rollback to HTTP transport is documented and verified.

## 8. Open Decisions (Resolve Before Coding)

1. Spring AI version and exact MCP config keys to standardize across environments.
2. Final internal header names (`X-API-Key` vs `X-Internal-API-Key`) and unified docs update.
3. Whether to keep both HTTP and SSE enabled during migration window.
