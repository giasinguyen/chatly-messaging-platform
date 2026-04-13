// ─── Agent Session ───────────────────────────────────────────
export interface AgentSession {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface AgentSessionList {
    sessions: AgentSession[];
    total: number;
}

// ─── Agent Message ──────────────────────────────────────────
export type AgentRole = "user" | "assistant" | "system";

export interface AgentMessage {
    id: string;
    session_id: string;
    role: AgentRole;
    content: string;
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
}

export interface AgentChatResponse {
    content: string;
    session_id: string;
    message_id: string;
    agent_type: string;
}

/** SSE stream chunk shapes */
export interface AgentStreamTokenChunk {
    token: string;
}

export interface AgentStreamDoneChunk {
    done: true;
    agent_type: string;
}

export type AgentStreamChunk = AgentStreamTokenChunk | AgentStreamDoneChunk;

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
    created_at: string;
    updated_at: string | null;
}

export interface McpServerCreate {
    name: string;
    url: string;
    headers: Record<string, string>;
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
