import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatbotHeader } from "./ChatbotHeader";
import { ChatbotMessageList } from "./ChatbotMessageList";
import { ChatbotComposer } from "./ChatbotComposer";
import { useChatbotStore } from "@/store/chatbot.store";
import { useAgentStream } from "@/hooks/useAgentStream";
import { agentService } from "@/services/agent.service";
import { toast } from "sonner";

interface Props {
    sessionId: string;
}

export function ChatbotWindow({ sessionId }: Props) {
    const navigate = useNavigate();
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
    } = useChatbotStore();

    const { startStream, cancelStream: _cancelStream } = useAgentStream();
    const messages = messagesBySession[sessionId] ?? [];
    const session = sessions.find((s) => s.id === sessionId);
    const isStreaming =
        streamingStatus === "streaming" || streamingStatus === "connecting";

    // Set active session and load history
    useEffect(() => {
        setActiveSessionId(sessionId);
        resetStreaming();

        let cancelled = false;
        const loadHistory = async () => {
            try {
                const data = await agentService.getHistory(sessionId);
                if (!cancelled) setMessages(sessionId, data.messages);
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
            // Append user message optimistically
            const userMsg = {
                id: `human-${Date.now()}`,
                session_id: sessionId,
                role: "human" as const,
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
        [sessionId, useWebSearch, selectedMcpIds, appendMessage, startStream],
    );

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
            <ChatbotHeader title={session?.title ?? "AI Chat"} />

            {/* Messages */}
            <ChatbotMessageList messages={messages} />

            {/* Composer */}
            <ChatbotComposer
                sessionId={sessionId}
                onSend={handleSend}
                disabled={isStreaming}
            />
        </div>
    );
}
