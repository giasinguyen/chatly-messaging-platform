import { useState, useCallback, useEffect } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import {
    getOtherParticipantId,
} from "@/utils/conversation";
import type { Message } from "@/types/message";
import type { ChatUser } from "@/types/message";
import type { ConversationResponse } from "@/types/conversation";

interface ChatWindowProps {
    id: string;
}

export function ChatWindow({ id }: ChatWindowProps) {
    const { user: currentUser } = useAuthStore();

    const [conversation, setConversation] = useState<ConversationResponse | null>(null);
    const [participant, setParticipant] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!currentUser || !id) return;

        const fetchConversation = async () => {
            try {
                setLoading(true);
                setNotFound(false);

                // Lấy chi tiết conversation
                const convRes = await conversationService.getById(id);
                const conv = convRes.result;
                setConversation(conv);

                // Với PRIVATE: lấy thông tin người đối phương
                if (conv.type === "PRIVATE") {
                    const otherId = getOtherParticipantId(conv, currentUser.id);
                    if (otherId) {
                        const usersRes = await userService.getAll();
                        const other = usersRes.result?.find((u) => u.id === otherId);
                        if (other) {
                            setParticipant({
                                id: other.id,
                                displayName: other.displayName,
                                username: other.username,
                                avatar: other.avatar,
                            });
                        }
                    }
                } else {
                    // GROUP: dùng tên nhóm
                    setParticipant({
                        id: conv.id,
                        displayName: conv.name ?? "Nhóm chat",
                        username: conv.name ?? "group",
                        avatar: conv.avatarUrl ?? undefined,
                    });
                }
            } catch (err) {
                console.error("Lỗi load conversation:", err);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        fetchConversation();
        // Reset messages khi chuyển sang conversation khác
        setMessages([]);
        setReplyingTo(null);
    }, [id, currentUser]);

    const handleReply = useCallback((msg: Message) => {
        setReplyingTo(msg);
    }, []);

    const handleCancelReply = useCallback(() => {
        setReplyingTo(null);
    }, []);

    const handleLoadMore = useCallback(() => {
        // TODO: fetch older messages from API
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 gap-3">
                <div className="h-10 w-10 rounded-full bg-muted/60 animate-pulse" />
                <div className="h-3 w-32 rounded bg-muted/60 animate-pulse" />
            </div>
        );
    }

    if (notFound || !conversation || !participant) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground">
                Hội thoại không tồn tại hoặc bạn không có quyền truy cập.
            </div>
        );
    }

    const replyingSenderName =
        replyingTo?.senderId === currentUser?.id
            ? "Bạn"
            : participant.displayName.split(" ").slice(-1)[0];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
            <ChatHeader user={participant} />

            <MessageList
                messages={messages}
                participant={participant}
                currentUserId={currentUser?.id ?? ""}
                onReply={handleReply}
                onLoadMore={handleLoadMore}
                isLoadingMore={false}
                hasMore={false}
            />

            <ChatInput
                replyingTo={replyingTo}
                senderName={replyingSenderName}
                onCancelReply={handleCancelReply}
            />
        </div>
    );
}
