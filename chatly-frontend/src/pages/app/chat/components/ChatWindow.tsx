import { useState, useCallback, useEffect, useRef } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { conversationService } from "@/services/conversation.service";
import { messageService } from "@/services/message.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { useChatSocket } from "@/hooks/useChatSocket";
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
    
    // Typing indicators
    const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());

    // Phân trang load-more
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const currentPageRef = useRef(0);

    // ----------------------------------------------------------------
    // 1. WebSocket Hook Integration
    // ----------------------------------------------------------------
    const onMessage = useCallback((msg: Message) => {
        setMessages((prev) => {
            // Tránh duplicate nếu message đã có (do API send trả về hoặc fetch)
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
        
        // Gửi seen nếu tin nhắn từ người khác
        if (msg.senderId !== currentUser?.id) {
            sendSeen(msg.id);
        }
    }, [currentUser?.id]);

    const onTyping = useCallback((data: { userId: string; typing: boolean }) => {
        if (data.userId === currentUser?.id) return;
        setTypingUserIds((prev) => {
            const next = new Set(prev);
            if (data.typing) next.add(data.userId);
            else next.delete(data.userId);
            return next;
        });
    }, [currentUser?.id]);

    const onRead = useCallback((msg: Message) => {
        setMessages((prev) => 
            prev.map(m => m.id === msg.id ? { ...m, status: msg.status, readBy: msg.readBy } : m)
        );
    }, []);

    const { sendMessage, sendTyping, sendSeen } = useChatSocket({
        conversationId: id,
        onMessage,
        onTyping,
        onRead
    });

    // ----------------------------------------------------------------
    // 2. Fetch initial data
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
                setTypingUserIds(new Set());
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
                setMessages([...fetched].reverse());
                setHasMore(fetched.length === PAGE_SIZE);
                
                // Đánh dấu các tin nhắn chưa đọc là seen
                fetched.forEach(m => {
                    if (m.senderId !== currentUser.id && m.status !== "READ") {
                        sendSeen(m.id);
                    }
                });
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
    }, [id, currentUser, sendSeen]);

    // ----------------------------------------------------------------
    // 3. Load thêm tin nhắn cũ khi kéo lên trên
    // ----------------------------------------------------------------
    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        try {
            setIsLoadingMore(true);
            const nextPage = currentPageRef.current + 1;
            const res = await messageService.getByConversation(id, nextPage, PAGE_SIZE);
            const fetched = res.result ?? [];

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
    // 4. Handlers: Gửi tin nhắn, Reply
    // ----------------------------------------------------------------
    const handleSendMessage = useCallback((content: string) => {
        if (!id || !currentUser) return;
        sendMessage(content, replyingTo?.id ?? null);
        setReplyingTo(null);
    }, [id, currentUser, replyingTo, sendMessage]);

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

    const isTyping = typingUserIds.size > 0;

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

            {isTyping && (
                <div className="absolute bottom-24 left-6 z-10 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 bg-muted/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground italic">
                            {participant.displayName.split(" ").slice(-1)[0]} đang soạn tin...
                        </span>
                    </div>
                </div>
            )}

            <ChatInput
                replyingTo={replyingTo}
                senderName={replyingSenderName}
                onCancelReply={handleCancelReply}
                onSendMessage={handleSendMessage}
                onTyping={sendTyping}
            />
        </div>
    );
}
