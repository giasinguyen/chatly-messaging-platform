import { create } from "zustand";
import type {
    AgentSession,
    AgentMessage,
    MessageAttachment,
    StreamingStatus,
    StatusHint,
} from "@/types/agent";

interface ChatbotState {
    // Sessions
    sessions: AgentSession[];
    activeSessionId: string | null;

    // Messages keyed by session id
    messagesBySession: Record<string, AgentMessage[]>;

    // Streaming
    streamingStatus: StreamingStatus;
    streamingContent: string;
    statusHint: StatusHint;

    // Composer state
    useWebSearch: boolean;
    selectedMcpIds: string[];
    draftsBySession: Record<string, string>;
    draftAttachmentsBySession: Record<string, MessageAttachment[]>;

    // Phase 2 — retry / edit
    lastUserPrompt: string | null;

    // Actions — sessions
    setSessions: (sessions: AgentSession[]) => void;
    addSession: (session: AgentSession) => void;
    removeSession: (sessionId: string) => void;
    setActiveSessionId: (id: string | null) => void;
    renameSession: (sessionId: string, title: string) => void;

    // Actions — messages
    setMessages: (sessionId: string, messages: AgentMessage[]) => void;
    appendMessage: (sessionId: string, message: AgentMessage) => void;

    // Actions — streaming
    setStreamingStatus: (status: StreamingStatus) => void;
    setStreamingContent: (content: string) => void;
    appendStreamToken: (token: string) => void;
    setStatusHint: (hint: StatusHint) => void;
    resetStreaming: () => void;

    // Actions — composer
    setUseWebSearch: (value: boolean) => void;
    setSelectedMcpIds: (ids: string[]) => void;
    setDraft: (sessionId: string, draft: string) => void;
    setDraftAttachments: (sessionId: string, attachments: MessageAttachment[]) => void;
    setLastUserPrompt: (prompt: string | null) => void;
}

export const useChatbotStore = create<ChatbotState>((set) => ({
    // Initial state
    sessions: [],
    activeSessionId: null,
    messagesBySession: {},
    streamingStatus: "idle",
    streamingContent: "",
    statusHint: "thinking",
    useWebSearch: false,
    selectedMcpIds: [],
    draftsBySession: {},
    draftAttachmentsBySession: {},
    lastUserPrompt: null,

    // Sessions
    setSessions: (sessions) => set({ sessions }),
    addSession: (session) =>
        set((s) => ({ sessions: [session, ...s.sessions] })),
    removeSession: (sessionId) =>
        set((s) => ({
            sessions: s.sessions.filter((sess) => sess.id !== sessionId),
            messagesBySession: (() => {
                const copy = { ...s.messagesBySession };
                delete copy[sessionId];
                return copy;
            })(),
            activeSessionId:
                s.activeSessionId === sessionId ? null : s.activeSessionId,
        })),
    setActiveSessionId: (id) => set({ activeSessionId: id }),
    renameSession: (sessionId, title) =>
        set((s) => ({
            sessions: s.sessions.map((sess) =>
                sess.id === sessionId ? { ...sess, title } : sess,
            ),
        })),

    // Messages
    setMessages: (sessionId, messages) =>
        set((s) => ({
            messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
        })),
    appendMessage: (sessionId, message) =>
        set((s) => ({
            messagesBySession: {
                ...s.messagesBySession,
                [sessionId]: [
                    ...(s.messagesBySession[sessionId] ?? []),
                    message,
                ],
            },
        })),

    // Streaming
    setStreamingStatus: (status) => set({ streamingStatus: status }),
    setStreamingContent: (content) => set({ streamingContent: content }),
    appendStreamToken: (token) =>
        set((s) => ({ streamingContent: s.streamingContent + token })),
    setStatusHint: (hint) => set({ statusHint: hint }),
    resetStreaming: () =>
        set({
            streamingStatus: "idle",
            streamingContent: "",
            statusHint: "thinking",
        }),

    // Composer
    setUseWebSearch: (value) => set({ useWebSearch: value }),
    setSelectedMcpIds: (ids) => set({ selectedMcpIds: ids }),
    setDraft: (sessionId, draft) =>
        set((s) => ({
            draftsBySession: { ...s.draftsBySession, [sessionId]: draft },
        })),
    setDraftAttachments: (sessionId, attachments) =>
        set((s) => ({
            draftAttachmentsBySession: { ...s.draftAttachmentsBySession, [sessionId]: attachments },
        })),
    setLastUserPrompt: (prompt) => set({ lastUserPrompt: prompt }),
}));
