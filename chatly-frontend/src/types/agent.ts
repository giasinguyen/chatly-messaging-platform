// ─── Agent Session ───────────────────────────────────────────
export interface AgentSession {
    id: string;
    user_id: string;
    title: string;
    context_conversation_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AgentSessionCreateOptions {
    title?: string;
    context_conversation_id?: string;
}

export interface AgentSessionList {
    sessions: AgentSession[];
    total: number;
}

// ─── Message Attachment ─────────────────────────────────────
export interface MessageAttachment {
    file_id: string;
    filename: string;
    content_type: string;
    size: number;
}

// ─── Agent Message ──────────────────────────────────────────
export type AgentRole = "user" | "assistant" | "system";

export interface AgentMessage {
    id: string;
    session_id: string;
    role: AgentRole;
    content: string;
    attachments: MessageAttachment[];
    created_at: string;
}

export interface AgentMessageHistory {
    messages: AgentMessage[];
}

// ─── Chat Request / Response ────────────────────────────────
export interface AgentChatRequest {
    message: string;
    use_web_search: boolean;
    mcp_server_ids: string[];
    file_ids: string[];
}

export interface AgentChatResponse {
    content: string;
    session_id: string;
    message_id: string;
    agent_type: string;
}

/** SSE stream event types */
export type StreamEventType = "token" | "tool_start" | "tool_end" | "error" | "done";

export interface AgentStreamEvent {
    type: StreamEventType;
    data: Record<string, unknown>;
}

export interface TokenEventData {
    content: string;
}

export interface ToolStartEventData {
    tool: string;
    input: Record<string, unknown>;
}

export interface ToolEndEventData {
    tool: string;
    output: string;
}

export interface ErrorEventData {
    message: string;
    code?: string;
    category?: string;
    retryable?: boolean;
}

export interface DoneEventData {
    agent_type: string;
    message_id: string;
    attachments?: MessageAttachment[];
}

export interface ToolCallState {
    tool: string;
    input?: Record<string, unknown>;
    output?: string;
    status: "running" | "done" | "cancelled";
}

// ─── File ───────────────────────────────────────────────────
export interface AgentFile {
    id: string;
    session_id: string;
    filename: string;
    content_type: string;
    size: number;
    created_at: string;
}

// ─── MCP ────────────────────────────────────────────────────
export interface McpServer {
    id: string;
    user_id: string;
    name: string;
    url: string;
    headers: Record<string, string>;
    is_active: boolean;
    transport: "sse" | "http";
    created_at: string;
    updated_at: string | null;
}

export interface McpServerCreate {
    name: string;
    url: string;
    headers: Record<string, string>;
    transport?: "sse" | "http";
}

export interface McpTool {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
}

// ─── Streaming UI State ─────────────────────────────────────
export type StreamingStatus = "idle" | "connecting" | "thinking" | "streaming" | "done" | "error";

export type StatusHint =
    | "thinking"
    | "searching_web"
    | "analyzing_documents"
    | "generating";

// ─── Social AI ──────────────────────────────────────────────
export interface StartChatFromPostResponse {
    sessionId: string;
    title: string;
    postSnippet: string;
}
