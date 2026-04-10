import axiosClient from "@/lib/axiosClient";
import type {
    AgentSession,
    AgentSessionList,
    AgentMessageHistory,
    AgentChatRequest,
    AgentChatResponse,
} from "@/types/agent";

const BASE = "/api/ai/sessions";

export const agentService = {
    // ─── Sessions ────────────────────────────────────────────
    createSession: async (title = "New Chat"): Promise<AgentSession> => {
        const res = await axiosClient.post(BASE, { title });
        return res.data;
    },

    listSessions: async (): Promise<AgentSessionList> => {
        const res = await axiosClient.get(BASE);
        return res.data;
    },

    getSession: async (sessionId: string): Promise<AgentSession> => {
        const res = await axiosClient.get(`${BASE}/${sessionId}`);
        return res.data;
    },

    deleteSession: async (sessionId: string): Promise<void> => {
        await axiosClient.delete(`${BASE}/${sessionId}`);
    },

    // ─── Messages ────────────────────────────────────────────
    getHistory: async (sessionId: string): Promise<AgentMessageHistory> => {
        const res = await axiosClient.get(`${BASE}/${sessionId}/messages`);
        return res.data;
    },

    // ─── Chat (blocking) ────────────────────────────────────
    chat: async (sessionId: string, payload: AgentChatRequest): Promise<AgentChatResponse> => {
        const res = await axiosClient.post(`${BASE}/${sessionId}/chat`, payload);
        return res.data;
    },

    // ─── Chat (SSE stream) — returns raw Response for streaming ─
    chatStream: (sessionId: string, payload: AgentChatRequest, signal?: AbortSignal): Promise<Response> => {
        const token = localStorage.getItem("access_token");
        return fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}${BASE}/${sessionId}/chat/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
            signal,
        });
    },
};
