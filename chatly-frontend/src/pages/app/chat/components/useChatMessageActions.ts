import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { messageService } from "@/services/message.service";
import { agentService } from "@/services/agent.service";
import { agentFileService } from "@/services/agent-file.service";
import { fileService } from "@/services/file.service";
import { useChatbotStore } from "@/store/chatbot.store";
import type {
    Attachment,
    ChatUser,
    LocationPayload,
    Message,
    Poll,
} from "@/types/message";
import { getErrorMessage } from "./chatWindow.utils";
import type { FailedMessageItem } from "./messageList.utils";

interface UseChatMessageActionsOptions {
    id: string;
    currentUserId: string | undefined;
    replyingTo: Message | null;
    setReplyingTo: (msg: Message | null) => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    failedMessages: FailedMessageItem[];
    setFailedMessages: React.Dispatch<React.SetStateAction<FailedMessageItem[]>>;
    sendMessage: (
        content: string,
        replyToId?: string | null,
        attachments?: Attachment[],
        poll?: Poll,
        priority?: string,
        mentions?: string[],
        messageType?: string,
        location?: LocationPayload,
    ) => boolean;
}

export function useChatMessageActions({
    id,
    currentUserId,
    replyingTo,
    setReplyingTo,
    setMessages,
    failedMessages,
    setFailedMessages,
    sendMessage,
}: UseChatMessageActionsOptions) {
    const { t } = useTranslation();
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [forwardingToAiMessage, setForwardingToAiMessage] = useState<Message | null>(null);
    const navigate = useNavigate();

    const handleSendMessage = useCallback(
        (
            content: string,
            attachments?: Attachment[],
            poll?: Poll,
            mentions?: string[],
            priority?: string,
            messageType?: string,
            location?: LocationPayload,
        ) => {
            if (!id || !currentUserId) return;
            const success = sendMessage(
                content,
                replyingTo?.id ?? null,
                attachments,
                poll,
                priority,
                mentions,
                messageType,
                location,
            );
            if (!success) {
                toast.error("Connection lost! Could not send message.");
                setFailedMessages((prev) => [
                    ...prev,
                    {
                        id: `failed-${Date.now()}`,
                        content,
                        attachments,
                        replyToId: replyingTo?.id,
                    },
                ]);
            }
            setReplyingTo(null);
        },
        [id, currentUserId, replyingTo, sendMessage, setFailedMessages, setReplyingTo],
    );

    const handleSendVCard = useCallback(
        (user: ChatUser) => {
            if (!id || !currentUserId) return;
            const cardContent = JSON.stringify({
                id: user.id,
                displayName: user.displayName,
                username: user.username,
                avatarUrl: user.avatarUrl ?? null,
            });
            const success = sendMessage(
                cardContent,
                replyingTo?.id ?? null,
                undefined,
                undefined,
                undefined,
                undefined,
                "VCARD",
            );
            if (!success) toast.error("Connection lost! Could not send card.");
            if (replyingTo) setReplyingTo(null);
        },
        [id, currentUserId, replyingTo, sendMessage, setReplyingTo],
    );

    const handleRetryMessage = useCallback(
        (failedId: string) => {
            const msg = failedMessages.find((m) => m.id === failedId);
            if (!msg) return;
            const success = sendMessage(msg.content, msg.replyToId ?? null, msg.attachments);
            if (success) {
                setFailedMessages((prev) => prev.filter((m) => m.id !== failedId));
            } else {
                toast.error("Please try again later.");
            }
        },
        [failedMessages, sendMessage, setFailedMessages],
    );

    const handleReply = useCallback(
        (msg: Message) => setReplyingTo(msg),
        [setReplyingTo],
    );
    const handleCancelReply = useCallback(() => setReplyingTo(null), [setReplyingTo]);

    const handleRecall = useCallback(
        async (messageId: string) => {
            try {
                await messageService.recall(messageId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? {
                                  ...m,
                                  recalled: true,
                                  recalledAt: new Date().toISOString(),
                                  recalledBy: currentUserId ?? null,
                              }
                            : m,
                    ),
                );
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not recall message"));
            }
        },
        [currentUserId, setMessages],
    );

    const handleEdit = useCallback(
        async (messageId: string, newContent: string) => {
            try {
                await messageService.edit(messageId, newContent);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? {
                                  ...m,
                                  content: newContent,
                                  edited: true,
                                  editedAt: new Date().toISOString(),
                              }
                            : m,
                    ),
                );
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not edit message"));
            }
        },
        [setMessages],
    );

    const handleDelete = useCallback(
        async (messageId: string) => {
            try {
                await messageService.delete(messageId);
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
                toast.success(t("chat.message_deleted"));
            } catch (error) {
                toast.error(getErrorMessage(error, t("chat.delete_message_failed")));
            }
        },
        [setMessages, t],
    );

    const handleForward = useCallback((message: Message) => {
        setForwardingMessage(message);
    }, []);

    const handleForwardConfirm = useCallback(
        async (targetConversationIds: string[]) => {
            if (!forwardingMessage) return;
            try {
                await messageService.forward(forwardingMessage.id, targetConversationIds);
                toast.success(
                    targetConversationIds.length > 1
                        ? "Message forwarded"
                        : "Message forwarded to selected conversation",
                );
                setForwardingMessage(null);
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not forward message"));
                throw error;
            }
        },
        [forwardingMessage],
    );

    const handleForwardToAi = useCallback((message: Message) => {
        setForwardingToAiMessage(message);
    }, []);

    const handleForwardToAiConfirm = useCallback(
        async (sessionId: string | null) => {
            if (!forwardingToAiMessage) return;

            const quotedContent = forwardingToAiMessage.content
                ? `> ${forwardingToAiMessage.content}`
                : "";

            try {
                let targetSessionId = sessionId;
                if (!targetSessionId) {
                    const newSession = await agentService.createSession();
                    targetSessionId = newSession.id;
                }

                // Upload message attachments to agent file storage
                const AGENT_SUPPORTED_EXTENSIONS = new Set([
                    "txt", "md", "pdf", "docx", "csv", "json",
                    "jpeg", "jpg", "png", "webp",
                ]);
                const AGENT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

                const draftAttachments = [];
                const attachments = forwardingToAiMessage.attachments ?? [];
                for (const att of attachments) {
                    const fileName = att.name ?? "file";
                    const ext = fileName.includes(".")
                        ? fileName.split(".").pop()!.toLowerCase()
                        : "";

                    if (!AGENT_SUPPORTED_EXTENSIONS.has(ext)) {
                        toast.error(`Unsupported file type: ${fileName}`);
                        continue;
                    }
                    if (att.size && att.size > AGENT_MAX_FILE_SIZE) {
                        toast.error(`File too large (max 5 MB): ${fileName}`);
                        continue;
                    }

                    try {
                        // Download through backend proxy to avoid S3 CORS issues
                        const blob = att.fileId
                            ? await fileService.downloadFile(att.fileId)
                            : await fetch(att.url).then((r) => r.blob());

                        if (blob.size > AGENT_MAX_FILE_SIZE) {
                            toast.error(`File too large (max 5 MB): ${fileName}`);
                            continue;
                        }

                        const file = new File([blob], fileName, { type: att.type });
                        const uploaded = await agentFileService.upload(targetSessionId, file);
                        draftAttachments.push({
                            file_id: uploaded.id,
                            filename: uploaded.filename,
                            content_type: uploaded.content_type,
                            size: uploaded.size,
                        });
                    } catch {
                        toast.error(`Could not transfer file: ${fileName}`);
                    }
                }

                // Fill into chatbot composer instead of auto-sending
                const store = useChatbotStore.getState();
                store.setDraft(targetSessionId, quotedContent);
                if (draftAttachments.length > 0) {
                    store.setDraftAttachments(targetSessionId, draftAttachments);
                }
                setForwardingToAiMessage(null);
                navigate(`/chatbot/${targetSessionId}`);
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not open AI assistant"));
                throw error;
            }
        },
        [forwardingToAiMessage, navigate],
    );

    return {
        forwardingMessage,
        setForwardingMessage,
        forwardingToAiMessage,
        setForwardingToAiMessage,
        handleSendMessage,
        handleSendVCard,
        handleRetryMessage,
        handleReply,
        handleCancelReply,
        handleRecall,
        handleEdit,
        handleDelete,
        handleForward,
        handleForwardConfirm,
        handleForwardToAi,
        handleForwardToAiConfirm,
    };
}
