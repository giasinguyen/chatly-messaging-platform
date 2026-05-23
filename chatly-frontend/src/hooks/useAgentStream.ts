import { useRef, useCallback, useState, useEffect } from "react";
import { agentService } from "@/services/agent.service";
import { useChatbotStore } from "@/store/chatbot.store";
import { toast } from "sonner";
import type {
    AgentChatRequest,
    AgentStreamEvent,
    DoneEventData,
    ErrorEventData,
    TokenEventData,
    ToolCallState,
    ToolStartEventData,
    ToolEndEventData,
} from "@/types/agent";

const HINT_ROTATION_INTERVAL_MS = 3000;

/**
 * Hook for streaming chat responses via POST SSE.
 * Handles normal token streaming and tool call progress.
 */
export function useAgentStream(sessionId?: string) {
    const abortRef = useRef<AbortController | null>(null);
    const [toolCalls, setToolCalls] = useState<ToolCallState[]>([]);

    // Reset local tool progress when session changes
    useEffect(() => {
        setToolCalls([]);
    }, [sessionId]);

    const _processEventStream = useCallback(
        async (response: Response, sid: string) => {
            if (!response.body) throw new Error("No response body");

            useChatbotStore.getState().setStreamingStatus("streaming");
            useChatbotStore.getState().setStatusHint("generating");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;
                    const jsonStr = trimmed.slice(5).trim();
                    if (!jsonStr) continue;

                    try {
                        const event: AgentStreamEvent = JSON.parse(jsonStr);

                        if (event.type === "token") {
                            const tokenData = event.data as unknown as TokenEventData;
                            useChatbotStore.getState().appendStreamToken(tokenData.content);
                        } else if (event.type === "tool_start") {
                            const toolData = event.data as unknown as ToolStartEventData;
                            setToolCalls((prev) => [
                                ...prev,
                                { tool: toolData.tool, input: toolData.input, status: "running" },
                            ]);
                        } else if (event.type === "tool_end") {
                            const toolData = event.data as unknown as ToolEndEventData;
                            setToolCalls((prev) =>
                                prev.map((tc) =>
                                    tc.tool === toolData.tool && tc.status === "running"
                                        ? { ...tc, output: toolData.output, status: "done" }
                                        : tc,
                                ),
                            );
                        } else if (event.type === "done") {
                            const doneData = event.data as unknown as DoneEventData;
                            const finalContent = useChatbotStore.getState().streamingContent;
                            useChatbotStore.getState().appendMessage(sid, {
                                id: doneData.message_id,
                                session_id: sid,
                                role: "assistant",
                                content: finalContent,
                                attachments: doneData.attachments ?? [],
                                created_at: new Date().toISOString(),
                            });
                            useChatbotStore.getState().setStreamingStatus("done");
                            setToolCalls([]);
                        } else if (event.type === "error") {
                            const errData = event.data as unknown as ErrorEventData;
                            const errMessage = errData.message ?? "AI response error";
                            toast.error(errMessage);
                            useChatbotStore.getState().setStreamingContent("");
                            useChatbotStore.getState().appendMessage(sid, {
                                id: `error-${Date.now()}`,
                                session_id: sid,
                                role: "assistant",
                                content: errMessage,
                                attachments: [],
                                created_at: new Date().toISOString(),
                            });
                            useChatbotStore.getState().setStreamingStatus("error");
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }

            // Finalize if done event was never sent
            const currentStatus = useChatbotStore.getState().streamingStatus;
            if (currentStatus === "streaming") {
                const finalContent = useChatbotStore.getState().streamingContent;
                if (finalContent) {
                    useChatbotStore.getState().appendMessage(sid, {
                        id: `assistant-${Date.now()}`,
                        session_id: sid,
                        role: "assistant",
                        content: finalContent,
                        attachments: [],
                        created_at: new Date().toISOString(),
                    });
                }
                useChatbotStore.getState().setStreamingStatus("idle");
            }
        },
        [],
    );

    const startStream = useCallback(
        async (sid: string, payload: AgentChatRequest) => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            const store = useChatbotStore.getState();
            store.setStreamingStatus("connecting");
            store.setStreamingContent("");
            store.setStatusHint("thinking");
            setToolCalls([]);

            let hintTimer: ReturnType<typeof setInterval> | undefined;
            const hints = payload.use_web_search
                ? (["thinking", "searching_web", "analyzing_documents"] as const)
                : (["thinking", "generating"] as const);
            let hintIdx = 0;
            hintTimer = setInterval(() => {
                hintIdx = (hintIdx + 1) % hints.length;
                useChatbotStore.getState().setStatusHint(hints[hintIdx]);
            }, HINT_ROTATION_INTERVAL_MS);

            try {
                const response = await agentService.chatStream(sid, payload, controller.signal);
                if (!response.ok) {
                    let userMessage = "AI service is temporarily unavailable. Please try again.";
                    try {
                        const body = await response.json() as { message?: string };
                        if (body.message) userMessage = body.message;
                    } catch {
                        // body is not JSON, keep default
                    }
                    throw new Error(userMessage);
                }
                clearInterval(hintTimer);
                hintTimer = undefined;
                await _processEventStream(response, sid);
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") {
                    useChatbotStore.getState().setStreamingStatus("idle");
                } else {
                    const message = err instanceof Error ? err.message : "Could not receive response from AI";
                    toast.error(message);
                    useChatbotStore.getState().setStreamingContent("");
                    useChatbotStore.getState().appendMessage(sid, {
                        id: `error-${Date.now()}`,
                        session_id: sid,
                        role: "assistant",
                        content: message,
                        attachments: [],
                        created_at: new Date().toISOString(),
                    });
                    useChatbotStore.getState().setStreamingStatus("error");
                }
            } finally {
                if (hintTimer) clearInterval(hintTimer);
                abortRef.current = null;
            }
        },
        [_processEventStream],
    );

    const cancelStream = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        useChatbotStore.getState().resetStreaming();
    }, []);

    return { startStream, cancelStream, toolCalls };
}
