import { useState, useCallback, useEffect, useRef } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { conversationService } from "@/services/conversation.service";
import { messageService } from "@/services/message.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { getOtherParticipantId } from "@/utils/conversation";
import type { Message, ChatUser } from "@/types/message";
import type { ConversationResponse } from "@/types/conversation";

const PAGE_SIZE = 20;

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

    // Phân trang load-more
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const currentPageRef = useRef(0);

    // ----------------------------------------------------------------
    // 1. Khi chuyển sang conversation mới: fetch info + messages trang đầu
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!currentUser || !id) return;

        let cancelled = false;

        const init = async () => {
            try {
                setLoading(true);
                setNotFound(false);
                setMessages([]);
                setReplyingTo(null);
                currentPageRef.current = 0;
                setHasMore(false);

                // Fetch conversation detail và tất cả users song song
                const [convRes, usersRes] = await Promise.all([
                    conversationService.getById(id),
                    userService.getAll(),
                ]);
                if (cancelled) return;

                const conv = convRes.result;
                setConversation(conv);

                // Lấy thông tin participant hiển thị
                const allUsers = usersRes.result ?? [];
                if (conv.type === "PRIVATE") {
                    const otherId = getOtherParticipantId(conv, currentUser.id);
                    const other = allUsers.find((u) => u.id === otherId);
                    setParticipant(
                        other
                            ? {
                                  id: other.id,
                                  displayName: other.displayName,
                                  username: other.username,
                                  avatarUrl: other.avatarUrl,
                              }
                            : {
                                  id: otherId ?? "",
                                  displayName: "Người dùng",
                                  username: "",
                              },
                    );
                } else {
                    setParticipant({
                        id: conv.id,
                        displayName: conv.name ?? "Nhóm chat",
                        username: "group",
                        avatarUrl: conv.avatarUrl ?? undefined,
                    });
                }

                // Fetch trang đầu messages
                const msgRes = await messageService.getByConversation(id, 0, PAGE_SIZE);
                if (cancelled) return;

                const fetched = msgRes.result ?? [];
                // API trả về mới nhất trước → reverse để render cũ → mới
                setMessages([...fetched].reverse());
                setHasMore(fetched.length === PAGE_SIZE);
            } catch (err) {
                console.error("Lỗi load conversation:", err);
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        init();
        return () => {
            cancelled = true;
        };
    }, [id, currentUser]);

    // ----------------------------------------------------------------
    // 2. Load thêm tin nhắn cũ khi kéo lên trên
    // ----------------------------------------------------------------
    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        try {
            setIsLoadingMore(true);
            const nextPage = currentPageRef.current + 1;
            const res = await messageService.getByConversation(id, nextPage, PAGE_SIZE);
            const fetched = res.result ?? [];

            // Prepend các tin nhắn cũ hơn (cũng cần reverse)
            setMessages((prev) => [...[...fetched].reverse(), ...prev]);
            currentPageRef.current = nextPage;
            setHasMore(fetched.length === PAGE_SIZE);
        } catch (err) {
            console.error("Lỗi load thêm tin nhắn:", err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [id, isLoadingMore, hasMore]);

    // ----------------------------------------------------------------
    // 3. Reply handlers
    // ----------------------------------------------------------------
    const handleReply = useCallback((msg: Message) => setReplyingTo(msg), []);
    const handleCancelReply = useCallback(() => setReplyingTo(null), []);

    // ----------------------------------------------------------------
    // Render states
    // ----------------------------------------------------------------
    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted/60 animate-pulse" />
                <div className="space-y-2 flex flex-col items-center">
                    <div className="h-3 w-32 rounded bg-muted/60 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
                </div>
            </div>
        );
    }

    if (notFound || !conversation || !participant) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground gap-2">
                <p className="text-sm">Hội thoại không tồn tại hoặc bạn không có quyền truy cập.</p>
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
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
            />

            <ChatInput
                replyingTo={replyingTo}
                senderName={replyingSenderName}
                onCancelReply={handleCancelReply}
            />
        </div>
    );
}
