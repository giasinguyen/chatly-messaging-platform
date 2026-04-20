import { useRef, useCallback, useState, useEffect } from "react";
import { agentService } from "@/services/agent.service";
import { useChatbotStore } from "@/store/chatbot.store";
import { toast } from "sonner";
import type {
    AgentChatRequest,
    AgentStreamEvent,
    DoneEventData,
    InterruptData,
    TokenEventData,
    ToolCallState,
    ToolStartEventData,
    ToolEndEventData,
} from "@/types/agent";

const HINT_ROTATION_INTERVAL_MS = 3000;

/**
 * Hook for streaming chat responses via POST SSE.
 * Handles normal token streaming, tool call progress, and HITL interrupts.
 */
export function useAgentStream(sessionId?: string) {
    const abortRef = useRef<AbortController | null>(null);
    const [toolCalls, setToolCalls] = useState<ToolCallState[]>([]);
    const [interrupt, setInterrupt] = useState<InterruptData | null>(null);

    // Reset interrupt state and check for a pending interrupt when session changes
    useEffect(() => {
        setInterrupt(null);
        setToolCalls([]);

        if (!sessionId) return;
        agentService.getSessionStatus(sessionId).then((status) => {
            if (status.status === "interrupted" && status.interrupt_data) {
                setInterrupt(status.interrupt_data);
            }
        }).catch(() => {
            // Status check is best-effort — ignore network errors
        });
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
                        } else if (event.type === "interrupt") {
                            const interruptData = event.data as unknown as InterruptData;
                            // Commit any partial LLM text that appeared before the interrupt
                            const partialContent = useChatbotStore.getState().streamingContent;
                            if (partialContent.trim()) {
                                useChatbotStore.getState().appendMessage(sid, {
                                    id: `assistant-partial-${Date.now()}`,
                                    session_id: sid,
                                    role: "assistant",
                                    content: partialContent,
                                    attachments: [],
                                    created_at: new Date().toISOString(),
                                });
                                useChatbotStore.getState().setStreamingContent("");
                            }
                            setInterrupt(interruptData);
                            useChatbotStore.getState().setStreamingStatus("idle");
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
                            const errData = event.data as { message: string };
                            toast.error(errData.message ?? "AI response error");
                            useChatbotStore.getState().setStreamingStatus("error");
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }

            // Finalize if done event was never sent (e.g. interrupt ended the stream)
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
            setInterrupt(null);

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
                if (!response.ok) throw new Error(`Stream request failed: ${response.status}`);
                clearInterval(hintTimer);
                hintTimer = undefined;
                await _processEventStream(response, sid);
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") {
                    useChatbotStore.getState().setStreamingStatus("idle");
                } else {
                    toast.error("Could not receive response from AI");
                    useChatbotStore.getState().setStreamingStatus("error");
                }
            } finally {
                if (hintTimer) clearInterval(hintTimer);
                abortRef.current = null;
            }
        },
        [_processEventStream],
    );

    const resumeStream = useCallback(
        async (sid: string, approved: boolean) => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            useChatbotStore.getState().setStreamingStatus("connecting");
            useChatbotStore.getState().setStreamingContent("");
            setInterrupt(null);
            setToolCalls([]);

            if (!approved) {
                setToolCalls((prev) =>
                    prev.map((tc) =>
                        tc.status === "running" ? { ...tc, status: "cancelled" } : tc,
                    ),
                );
            }

            try {
                const response = await agentService.chatStreamResume(
                    sid,
                    approved,
                    controller.signal,
                );
                if (!response.ok) throw new Error(`Resume request failed: ${response.status}`);
                await _processEventStream(response, sid);
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") {
                    useChatbotStore.getState().setStreamingStatus("idle");
                } else {
                    toast.error("Could not resume the session");
                    useChatbotStore.getState().setStreamingStatus("error");
                }
            } finally {
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

    return { startStream, resumeStream, cancelStream, toolCalls, interrupt };
}
