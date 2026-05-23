import { create } from 'zustand';
import type {
    AgentSession,
    AgentMessage,
    StreamingStatus,
    StatusHint,
    ToolCallState,
} from '@/types/agent';

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
    toolCalls: ToolCallState[];

    // Composer state
    useWebSearch: boolean;
    selectedMcpIds: string[];
    draftsBySession: Record<string, string>;

    // Retry / edit
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
    setToolCalls: (calls: ToolCallState[]) => void;
    addToolCall: (call: ToolCallState) => void;
    updateToolCall: (toolName: string, update: Partial<ToolCallState>) => void;
    resetStreaming: () => void;

    // Actions — composer
    setUseWebSearch: (value: boolean) => void;
    setSelectedMcpIds: (ids: string[]) => void;
    setDraft: (sessionId: string, draft: string) => void;
    setLastUserPrompt: (prompt: string | null) => void;
}

export const useChatbotStore = create<ChatbotState>((set) => ({
    sessions: [],
    activeSessionId: null,
    messagesBySession: {},
    streamingStatus: 'idle',
    streamingContent: '',
    statusHint: 'thinking',
    toolCalls: [],
    useWebSearch: false,
    selectedMcpIds: [],
    draftsBySession: {},
    lastUserPrompt: null,

    setSessions: (sessions) => set({ sessions }),
    addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
    removeSession: (sessionId) =>
        set((s) => ({
            sessions: s.sessions.filter((sess) => sess.id !== sessionId),
            messagesBySession: (() => {
                const copy = { ...s.messagesBySession };
                delete copy[sessionId];
                return copy;
            })(),
            activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId,
        })),
    setActiveSessionId: (id) => set({ activeSessionId: id }),
    renameSession: (sessionId, title) =>
        set((s) => ({
            sessions: s.sessions.map((sess) => (sess.id === sessionId ? { ...sess, title } : sess)),
        })),

    setMessages: (sessionId, messages) =>
        set((s) => ({
            messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
        })),
    appendMessage: (sessionId, message) =>
        set((s) => ({
            messagesBySession: {
                ...s.messagesBySession,
                [sessionId]: [...(s.messagesBySession[sessionId] ?? []), message],
            },
        })),

    setStreamingStatus: (status) => set({ streamingStatus: status }),
    setStreamingContent: (content) => set({ streamingContent: content }),
    appendStreamToken: (token) => set((s) => ({ streamingContent: s.streamingContent + token })),
    setStatusHint: (hint) => set({ statusHint: hint }),
    setToolCalls: (calls) => set({ toolCalls: calls }),
    addToolCall: (call) => set((s) => ({ toolCalls: [...s.toolCalls, call] })),
    updateToolCall: (toolName, update) =>
        set((s) => ({
            toolCalls: s.toolCalls.map((tc) =>
                tc.tool === toolName && tc.status === 'running' ? { ...tc, ...update } : tc,
            ),
        })),
    resetStreaming: () =>
        set({
            streamingStatus: 'idle',
            streamingContent: '',
            statusHint: 'thinking',
            toolCalls: [],
        }),

    setUseWebSearch: (value) => set({ useWebSearch: value }),
    setSelectedMcpIds: (ids) => set({ selectedMcpIds: ids }),
    setDraft: (sessionId, draft) =>
        set((s) => ({
            draftsBySession: { ...s.draftsBySession, [sessionId]: draft },
        })),
    setLastUserPrompt: (prompt) => set({ lastUserPrompt: prompt }),
}));
