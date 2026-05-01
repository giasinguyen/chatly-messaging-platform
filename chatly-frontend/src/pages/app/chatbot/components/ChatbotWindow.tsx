import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatbotHeader } from "./ChatbotHeader";
import { ChatbotMessageList } from "./ChatbotMessageList";
import { ChatbotComposer } from "./ChatbotComposer";
import { ChatbotEmptyState } from "./ChatbotEmptyState";
import { useChatbotStore } from "@/store/chatbot.store";
import { useAgentStream } from "@/hooks/useAgentStream";
import { agentService } from "@/services/agent.service";
import { conversationService } from "@/services/conversation.service";
import { fileService } from "@/services/file.service";
import { ForwardToChatDialog } from "./ForwardToChatDialog";
import { useAuthStore } from "@/store/auth.store";
import { AgentThinking } from "./AgentThinking";
import { toast } from "sonner";
import type { AgentMessage, MessageAttachment } from "@/types/agent";
import type { Attachment } from "@/types/message";

const DRAFT_SESSION_PLACEHOLDER = "__new__";

interface Props {
    sessionId?: string;
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
}

export function ChatbotWindow({ sessionId, sidebarCollapsed, onToggleSidebar }: Props) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const autoSendFired = useRef(false);
    const { user } = useAuthStore();
    const [forwardingAgentMessage, setForwardingAgentMessage] = useState<AgentMessage | null>(null);
    const {
        sessions,
        messagesBySession,
        setMessages,
        appendMessage,
        addSession,
        setActiveSessionId,
        streamingStatus,
        useWebSearch,
        selectedMcpIds,
        resetStreaming,
        lastUserPrompt,
        setLastUserPrompt,
        setDraft,
    } = useChatbotStore();

    const { startStream, cancelStream, toolCalls } = useAgentStream(sessionId);
    const messages = sessionId ? (messagesBySession[sessionId] ?? []) : [];
    const session = sessions.find((s) => s.id === sessionId);
    const isStreaming =
        streamingStatus === "streaming" || streamingStatus === "connecting";
    const [loadingHistory, setLoadingHistory] = useState(
        sessionId ? !messagesBySession[sessionId]?.length : false,
    );
    const [contextConversationName, setContextConversationName] = useState<string | undefined>();

    // Load context conversation name when session has a context_conversation_id
    useEffect(() => {
        if (!session?.context_conversation_id) {
            setContextConversationName(undefined);
            return;
        }
        conversationService.getById(session.context_conversation_id)
            .then((res) => {
                if (res.code === 1000 && res.result) {
                    setContextConversationName(res.result.name ?? "Group chat");
                }
            })
            .catch(() => {
                // Silently ignore — name is non-critical
            });
    }, [session?.context_conversation_id]);

    // Set active session and load history
    useEffect(() => {
        autoSendFired.current = false;

        if (!sessionId) {
            setActiveSessionId(null);
            resetStreaming();
            setLastUserPrompt(null);
            setLoadingHistory(false);
            return;
        }

        setActiveSessionId(sessionId);
        resetStreaming();
        setLastUserPrompt(null);

        let cancelled = false;
        const loadHistory = async () => {
            setLoadingHistory(true);
            try {
                const data = await agentService.getHistory(sessionId);
                if (!cancelled) {
                    // Guard: don't overwrite messages that were already added optimistically
                    const current = useChatbotStore.getState().messagesBySession[sessionId];
                    if (!current?.length) {
                        setMessages(sessionId, data.messages);
                    }
                }
            } catch {
                toast.error("Failed to load chat history");
            } finally {
                if (!cancelled) setLoadingHistory(false);
            }
        };

        if (!messagesBySession[sessionId]?.length) {
            loadHistory();
        } else {
            setLoadingHistory(false);
        }

        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    const handleForwardToChat = useCallback((msg: AgentMessage) => {
        setForwardingAgentMessage(msg);
    }, []);

    const handleForwardToChatConfirm = useCallback(
        async (conversationId: string) => {
            if (!forwardingAgentMessage || !sessionId) return;

            const uploadedAttachments: Attachment[] = [];
            for (const att of forwardingAgentMessage.attachments) {
                try {
                    const blob = await agentService.downloadFile(sessionId, att.file_id);
                    const file = new File([blob], att.filename, { type: att.content_type });
                    const uploaded = await fileService.upload(file, conversationId);
                    uploadedAttachments.push({
                        fileId: uploaded.fileId,
                        url: uploaded.url,
                        name: uploaded.fileName,
                        type: uploaded.fileType,
                        size: uploaded.fileSize,
                    });
                } catch {
                    toast.error(`Could not transfer file: ${att.filename}`);
                }
            }

            setForwardingAgentMessage(null);
            navigate(`/chat/${conversationId}`, {
                state: {
                    prefillContent: forwardingAgentMessage.content || undefined,
                    prefillAttachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
                },
            });
        },
        [forwardingAgentMessage, sessionId, navigate],
    );

    const handleSend = useCallback(
        async (content: string, attachments: MessageAttachment[] = []) => {
            if (!sessionId) {
                // No session yet — create one, store the draft, then navigate and auto-send
                try {
                    const newSession = await agentService.createSession();
                    addSession(newSession);
                    setDraft(newSession.id, content);
                    navigate(`/chatbot/${newSession.id}?autoSend=1`);
                } catch {
                    toast.error("Failed to create new conversation");
                }
                return;
            }

            setLastUserPrompt(content);

            const userMsg = {
                id: `user-${Date.now()}`,
                session_id: sessionId,
                role: "user" as const,
                content,
                attachments,
                created_at: new Date().toISOString(),
            };
            appendMessage(sessionId, userMsg);

            await startStream(sessionId, {
                message: content,
                use_web_search: useWebSearch,
                mcp_server_ids: selectedMcpIds,
                file_ids: attachments.map((a) => a.file_id),
            });
        },
        [sessionId, useWebSearch, selectedMcpIds, appendMessage, addSession, startStream, setLastUserPrompt, setDraft, navigate],
    );

    // Auto-send draft when navigated with ?autoSend=1
    useEffect(() => {
        if (!sessionId) return;
        if (autoSendFired.current) return;
        if (searchParams.get("autoSend") !== "1") return;
        const draft = useChatbotStore.getState().draftsBySession[sessionId];
        if (!draft?.trim()) return;
        autoSendFired.current = true;
        setSearchParams({}, { replace: true });
        setDraft(sessionId, "");
        handleSend(draft.trim());
    }, [sessionId, searchParams, handleSend, setSearchParams, setDraft]);

    const handleEdit = useCallback(
        (message: AgentMessage) => {
            if (!sessionId) return;
            setDraft(sessionId, message.content);
        },
        [sessionId, setDraft],
    );

    const handleRetry = useCallback(
        async (message: AgentMessage) => {
            if (isStreaming) return;
            await handleSend(message.content);
        },
        [handleSend, isStreaming],
    );

    const handleRetryLast = useCallback(async () => {
        if (!lastUserPrompt || isStreaming) return;
        await handleSend(lastUserPrompt);
    }, [lastUserPrompt, isStreaming, handleSend]);

    const showEmptyState = !loadingHistory && (!sessionId || messages.length === 0);

    return (
        <div className="flex flex-col h-full">
            {/* Mobile back button */}
            {sessionId && (
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
            )}
            <ChatbotHeader
                title={session?.title ?? "AI Chat"}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
            />

            {/* Messages or empty state */}
            {showEmptyState ? (
                <ChatbotEmptyState
                    sidebarCollapsed={sidebarCollapsed}
                    onToggleSidebar={onToggleSidebar}
                    onChipSelect={handleSend}
                    contextConversationName={contextConversationName}
                />
            ) : sessionId ? (
                <ChatbotMessageList
                    messages={messages}
                    sessionId={sessionId}
                    onEdit={handleEdit}
                    onRetry={handleRetry}
                    onRetryLast={handleRetryLast}
                    onForwardToChat={handleForwardToChat}
                />
            ) : null}

            {/* Tool call progress while streaming */}
            {isStreaming && toolCalls.length > 0 && (
                <div className="px-4">
                    <AgentThinking toolCalls={toolCalls} />
                </div>
            )}

            {/* Composer — always visible */}
            <ChatbotComposer
                sessionId={sessionId ?? DRAFT_SESSION_PLACEHOLDER}
                isStreaming={isStreaming}
                onCancel={cancelStream}
                onSend={handleSend}
                disabled={isStreaming}
            />

            {/* Forward agent message to chat conversation */}
            <ForwardToChatDialog
                open={!!forwardingAgentMessage}
                currentUserId={user?.id ?? ""}
                onOpenChange={(open) => {
                    if (!open) setForwardingAgentMessage(null);
                }}
                onConfirm={handleForwardToChatConfirm}
            />

        </div>
    );
}
