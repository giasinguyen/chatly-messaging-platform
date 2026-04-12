import { useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatbotHeader } from "./ChatbotHeader";
import { ChatbotMessageList } from "./ChatbotMessageList";
import { ChatbotComposer } from "./ChatbotComposer";
import { useChatbotStore } from "@/store/chatbot.store";
import { useAgentStream } from "@/hooks/useAgentStream";
import { agentService } from "@/services/agent.service";
import { toast } from "sonner";
import type { AgentMessage } from "@/types/agent";

interface Props {
    sessionId: string;
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
}

export function ChatbotWindow({ sessionId, sidebarCollapsed, onToggleSidebar }: Props) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const autoSendFired = useRef(false);
    const {
        sessions,
        messagesBySession,
        setMessages,
        appendMessage,
        setActiveSessionId,
        streamingStatus,
        useWebSearch,
        selectedMcpIds,
        resetStreaming,
        lastUserPrompt,
        setLastUserPrompt,
        setDraft,
    } = useChatbotStore();

    const { startStream, cancelStream } = useAgentStream();
    const messages = messagesBySession[sessionId] ?? [];
    const session = sessions.find((s) => s.id === sessionId);
    const isStreaming =
        streamingStatus === "streaming" || streamingStatus === "connecting";

    // Set active session and load history
    useEffect(() => {
        setActiveSessionId(sessionId);
        resetStreaming();
        setLastUserPrompt(null);

        let cancelled = false;
        const loadHistory = async () => {
            try {
                const data = await agentService.getHistory(sessionId);
                if (!cancelled) {
                    // Guard: don't overwrite messages that were already added optimistically
                    // (e.g. auto-send from empty state appended the first user message)
                    const current = useChatbotStore.getState().messagesBySession[sessionId];
                    if (!current?.length) {
                        setMessages(sessionId, data.messages);
                    }
                }
            } catch {
                toast.error("Không thể tải lịch sử chat");
            }
        };

        // Only load if we don't already have messages cached
        if (!messagesBySession[sessionId]?.length) {
            loadHistory();
        }

        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    const handleSend = useCallback(
        async (content: string) => {
            setLastUserPrompt(content);

            // Append user message optimistically
            const userMsg = {
                id: `user-${Date.now()}`,
                session_id: sessionId,
                role: "user" as const,
                content,
                created_at: new Date().toISOString(),
            };
            appendMessage(sessionId, userMsg);

            // Start streaming response
            await startStream(sessionId, {
                message: content,
                use_web_search: useWebSearch,
                mcp_server_ids: selectedMcpIds,
            });
        },
        [sessionId, useWebSearch, selectedMcpIds, appendMessage, startStream, setLastUserPrompt],
    );

    // Auto-send draft when navigated from empty state
    useEffect(() => {
        if (autoSendFired.current) return;
        if (searchParams.get("autoSend") !== "1") return;
        const draft = useChatbotStore.getState().draftsBySession[sessionId];
        if (!draft?.trim()) return;
        autoSendFired.current = true;
        setSearchParams({}, { replace: true });
        setDraft(sessionId, "");
        handleSend(draft.trim());
    }, [sessionId, searchParams, handleSend, setSearchParams, setDraft]);

    // Edit: populate draft with edited content and send as new turn
    const handleEdit = useCallback(
        (message: AgentMessage) => {
            setDraft(sessionId, message.content);
        },
        [sessionId, setDraft],
    );

    // Retry: resend the same user message
    const handleRetry = useCallback(
        async (message: AgentMessage) => {
            if (isStreaming) return;
            await handleSend(message.content);
        },
        [handleSend, isStreaming],
    );

    // Retry last prompt (after error/cancel)
    const handleRetryLast = useCallback(async () => {
        if (!lastUserPrompt || isStreaming) return;
        await handleSend(lastUserPrompt);
    }, [lastUserPrompt, isStreaming, handleSend]);

    return (
        <div className="flex flex-col h-full">
            {/* Mobile back button + Header */}
            <div className="flex items-center md:hidden px-2 pt-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate("/chatbot")}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </div>
            <ChatbotHeader
                title={session?.title ?? "AI Chat"}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
            />

            {/* Messages */}
            <ChatbotMessageList
                messages={messages}
                onEdit={handleEdit}
                onRetry={handleRetry}
                onRetryLast={handleRetryLast}
            />

            {/* Composer */}
            <ChatbotComposer
                sessionId={sessionId}
                isStreaming={isStreaming}
                onCancel={cancelStream}
                onSend={handleSend}
                disabled={isStreaming}
            />
        </div>
    );
}
