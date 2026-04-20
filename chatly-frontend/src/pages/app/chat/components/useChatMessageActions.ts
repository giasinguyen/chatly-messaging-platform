import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { messageService } from "@/services/message.service";
import { agentService } from "@/services/agent.service";
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
    const navigate = useNavigate();
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

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

            // If @AI was mentioned, open the AI assistant with conversation context
            if (success && mentions?.includes("AI")) {
                agentService.createSession({ context_conversation_id: id })
                    .then((session) => navigate(`/chatbot/${session.id}`))
                    .catch(() => toast.error("Failed to open AI assistant"));
            }
        },
        [id, currentUserId, replyingTo, sendMessage, setFailedMessages, setReplyingTo, navigate],
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
                toast.success("Message deleted");
            } catch (error) {
                toast.error(getErrorMessage(error, "Could not delete message"));
            }
        },
        [setMessages],
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

    return {
        forwardingMessage,
        setForwardingMessage,
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
    };
}
