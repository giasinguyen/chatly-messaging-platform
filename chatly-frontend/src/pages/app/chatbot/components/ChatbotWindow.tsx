import { useEffect, useCallback, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChatbotHeader } from "./ChatbotHeader";
import { ChatbotMessageList } from "./ChatbotMessageList";
import { ChatbotComposer } from "./ChatbotComposer";
import { ChatbotEmptyState } from "./ChatbotEmptyState";
import { ChatbotMobileBackButton } from "./ChatbotMobileBackButton";
import { useChatbotStore } from "@/store/chatbot.store";
import { useAgentStream } from "@/hooks/useAgentStream";
import { agentService } from "@/services/agent.service";
import { conversationService } from "@/services/conversation.service";
import { fileService } from "@/services/file.service";
import { ForwardToChatDialog } from "./ForwardToChatDialog";
import { useEnsureAgentSession } from "./useEnsureAgentSession";
import { useAuthStore } from "@/store/auth.store";
import { AgentThinking } from "./AgentThinking";
import { toast } from "sonner";
import type { AgentMessage, MessageAttachment } from "@/types/agent";
import type { Attachment } from "@/types/message";
import { DRAFT_AGENT_SESSION_ID } from "@/constants/ai";
const SOCIAL_POST_CONTEXT_PREFIX = "social:post:";

interface ChatbotNavigationState {
    contextMode?: "group" | "post";
    title?: string;
    postSnippet?: string;
}

interface Props {
    sessionId?: string;
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
}

export function ChatbotWindow({ sessionId, sidebarCollapsed, onToggleSidebar }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
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
    const ensureSession = useEnsureAgentSession(sessionId);
    const messages = sessionId ? (messagesBySession[sessionId] ?? []) : [];
    const session = sessions.find((s) => s.id === sessionId);
    const isPostContextSession = !!session?.context_conversation_id?.startsWith(SOCIAL_POST_CONTEXT_PREFIX);
    const isStreaming =
        streamingStatus === "streaming" || streamingStatus === "connecting";
    const [loadingHistory, setLoadingHistory] = useState(
        sessionId ? !messagesBySession[sessionId]?.length : false,
    );
    const [contextConversationName, setContextConversationName] = useState<string | undefined>();
    const navigationState = (location.state as ChatbotNavigationState | null) ?? null;
    const isNavigationPostContext = navigationState?.contextMode === "post";

    useEffect(() => {
        if (!session?.context_conversation_id) {
            setContextConversationName(isNavigationPostContext ? navigationState?.title ?? "Post context" : undefined);
            return;
        }
        if (session.context_conversation_id.startsWith(SOCIAL_POST_CONTEXT_PREFIX)) {
            setContextConversationName(session.title ?? navigationState?.title ?? "Post context");
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
    }, [session?.context_conversation_id, session?.title, isNavigationPostContext, navigationState?.title]);

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
            {sessionId && (
                <ChatbotMobileBackButton onBack={() => navigate("/chatbot")} />
            )}
            <ChatbotHeader
                title={session?.title ?? navigationState?.title ?? "AI Chat"}
                subtitle={isPostContextSession || isNavigationPostContext ? "Post context" : "AI Assistant"}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
            />

            {showEmptyState ? (
                <ChatbotEmptyState
                    sidebarCollapsed={sidebarCollapsed}
                    onToggleSidebar={onToggleSidebar}
                    onChipSelect={handleSend}
                    contextConversationName={contextConversationName}
                    contextMode={isPostContextSession || isNavigationPostContext ? "post" : session?.context_conversation_id ? "group" : null}
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

            {isStreaming && toolCalls.length > 0 && (
                <div className="px-4">
                    <AgentThinking toolCalls={toolCalls} />
                </div>
            )}

            <ChatbotComposer
                sessionId={sessionId ?? DRAFT_AGENT_SESSION_ID}
                isStreaming={isStreaming}
                onCancel={cancelStream}
                onSend={handleSend}
                onEnsureSession={ensureSession}
                disabled={isStreaming}
            />

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
