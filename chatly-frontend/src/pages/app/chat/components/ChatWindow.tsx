import { useState, useCallback, useEffect, useRef } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { GroupManagementPanel } from "./GroupManagementPanel";
import { conversationService } from "@/services/conversation.service";
import { contactService } from "@/services/contact.service";
import { messageService } from "@/services/message.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { useChatSocket } from "@/hooks/useChatSocket";
import { usePresenceSocket, type PresenceEvent } from "@/hooks/usePresenceSocket";
import { getOtherParticipantId } from "@/utils/conversation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PresenceIndicator } from "@/components/customize/PresenceIndicator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CalendarDays, Loader2, Phone, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Message, ChatUser } from "@/types/message";
import type { ContactStatus } from "@/types/contact";
import type { ConversationResponse } from "@/types/conversation";

const PAGE_SIZE = 20;

interface ChatWindowProps {
    id: string;
}

function getPrivacyFlag(user: Record<string, unknown>, field: "phone" | "dob") {
    const privacy = user.privacy as Record<string, unknown> | undefined;
    const normalizeVisibility = (value: unknown) => {
        if (typeof value === "boolean") return value;
        if (typeof value !== "string") return undefined;

        const normalized = value.toLowerCase();
        if (normalized === "hidden" || normalized === "none" || normalized === "private") {
            return false;
        }
        if (normalized === "everyone" || normalized === "public" || normalized === "friends") {
            return true;
        }
        return undefined;
    };

    if (field === "phone") {
        const direct = normalizeVisibility(user.showPhone);
        const nested = normalizeVisibility(privacy?.showPhone);
        const directVisibility = normalizeVisibility(user.phoneVisibility);
        const nestedVisibility = normalizeVisibility(privacy?.phoneVisibility);

        if (typeof direct === "boolean") return direct;
        if (typeof nested === "boolean") return nested;
        if (typeof directVisibility === "boolean") return directVisibility;
        if (typeof nestedVisibility === "boolean") return nestedVisibility;
    }

    const direct = normalizeVisibility(user.showDob);
    const nested = normalizeVisibility(privacy?.showDob);
    const directVisibility = normalizeVisibility(user.dobVisibility);
    const nestedVisibility = normalizeVisibility(privacy?.dobVisibility);

    if (typeof direct === "boolean") return direct;
    if (typeof nested === "boolean") return nested;
    if (typeof directVisibility === "boolean") return directVisibility;
    if (typeof nestedVisibility === "boolean") return nestedVisibility;
    return true;
}

function formatDob(dob?: string) {
    if (!dob) return "Chưa cập nhật";
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return "Chưa cập nhật";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(parsed);
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
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [contactStatus, setContactStatus] = useState<ContactStatus | null>(null);
    const [sendingContact, setSendingContact] = useState(false);
    const [showGroupPanel, setShowGroupPanel] = useState(false);

    // Presence tracking
    const [presenceMap, setPresenceMap] = useState<Record<string, { status: string; lastSeen: string | null }>>({});

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

    // Presence socket hook
    const onPresenceChange = useCallback((event: PresenceEvent) => {
        setPresenceMap((prev) => ({
            ...prev,
            [event.userId]: { status: event.status, lastSeen: event.lastSeen },
        }));
    }, []);

    usePresenceSocket({ onPresenceChange });

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
                const [convRes, usersRes, contactsRes] = await Promise.all([
                    conversationService.getById(id),
                    userService.getAll(),
                    contactService.getAll().catch(() => ({ result: [] })),
                ]);
                if (cancelled) return;

                const conv = convRes.result;
                setConversation(conv);

                // Lấy thông tin participant hiển thị
                const allUsers = usersRes.result ?? [];
                const allContacts = contactsRes.result ?? [];
                if (conv.type === "PRIVATE") {
                    const otherId = getOtherParticipantId(conv, currentUser.id);
                    const other = allUsers.find((u) => u.id === otherId);
                    const otherRecord = (other ?? {}) as Record<string, unknown>;

                    setParticipant(
                        other
                            ? {
                                  id: other.id,
                                  displayName: other.displayName,
                                  username: other.username,
                                  avatarUrl: other.avatarUrl,
                                  phone: other.phone,
                                  dob: other.dob,
                                  privacy: {
                                      showPhone: getPrivacyFlag(otherRecord, "phone"),
                                      showDob: getPrivacyFlag(otherRecord, "dob"),
                                  },
                              }
                            : {
                                  id: otherId ?? "",
                                  displayName: "Người dùng",
                                  username: "",
                              },
                    );

                    const relation = allContacts.find(
                        (c) =>
                            (c.user.id === currentUser.id && c.contact.id === otherId) ||
                            (c.user.id === otherId && c.contact.id === currentUser.id),
                    );
                    setContactStatus(relation?.status ?? null);

                    // Initialize presence from fetched user data
                    if (other && otherId) {
                        setPresenceMap((prev) => ({
                            ...prev,
                            [otherId]: {
                                status: other.status ?? "OFFLINE",
                                lastSeen: other.lastSeen ?? null,
                            },
                        }));
                    }
                } else {
                    setParticipant({
                        id: conv.id,
                        displayName: conv.name ?? "Nhóm chat",
                        username: "group",
                        avatarUrl: conv.avatarUrl ?? undefined,
                    });
                    setContactStatus(null);
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

    const handleSendFriendRequest = useCallback(async () => {
        if (!participant || conversation?.type !== "PRIVATE") return;
        if (contactStatus === "ACCEPTED" || contactStatus === "PENDING") return;

        try {
            setSendingContact(true);
            await contactService.sendRequest({ contactId: participant.id });
            setContactStatus("PENDING");
            toast.success("Đã gửi lời mời kết bạn");
        } catch (error) {
            toast.error("Không thể gửi lời mời kết bạn");
        } finally {
            setSendingContact(false);
        }
    }, [participant, conversation?.type, contactStatus]);

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
    const showPhone = participant.privacy?.showPhone !== false;
    const showDob = participant.privacy?.showDob !== false;
    const canAddFriend =
        conversation.type === "PRIVATE" &&
        participant.id &&
        participant.id !== currentUser?.id &&
        !["ACCEPTED", "PENDING"].includes(contactStatus ?? "");

    // Determine presence status for the other participant
    const isGroup = conversation.type === "GROUP";
    const participantPresence = !isGroup
        ? presenceMap[participant.id] ?? undefined
        : undefined;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
            <ChatHeader
                user={participant}
                onOpenProfile={() => setShowProfileDialog(true)}
                isGroup={isGroup}
                onOpenGroupPanel={isGroup ? () => setShowGroupPanel(true) : undefined}
                presenceStatus={participantPresence?.status}
                lastSeen={participantPresence?.lastSeen}
            />

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

            <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Thông tin người dùng</DialogTitle>
                        <DialogDescription>
                            Hồ sơ hiển thị theo quyền riêng tư của người này.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-14 w-14 border border-border/60">
                                <AvatarImage src={participant.avatarUrl} />
                                <AvatarFallback>
                                    {participant.displayName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-base font-semibold text-foreground truncate">
                                    {participant.displayName}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                    @{participant.username || "unknown"}
                                </p>
                                {!isGroup && participantPresence && (
                                    <PresenceIndicator
                                        status={participantPresence.status}
                                        lastSeen={participantPresence.lastSeen}
                                        showLabel
                                        className="mt-1"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <Phone size={14} />
                                    Số điện thoại
                                </span>
                                <span className="font-medium text-foreground">
                                    {showPhone
                                        ? participant.phone || "Chưa cập nhật"
                                        : "Đã ẩn"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <CalendarDays size={14} />
                                    Ngày sinh
                                </span>
                                <span className="font-medium text-foreground">
                                    {showDob ? formatDob(participant.dob) : "Đã ẩn"}
                                </span>
                            </div>
                        </div>

                        {conversation.type === "PRIVATE" && (
                            <div className="flex items-center gap-2">
                                {contactStatus === "ACCEPTED" && (
                                    <Badge variant="secondary">Đã là bạn bè</Badge>
                                )}
                                {contactStatus === "PENDING" && (
                                    <Badge variant="outline">Đã gửi lời mời</Badge>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {canAddFriend && (
                            <Button
                                onClick={handleSendFriendRequest}
                                disabled={sendingContact}
                                className="w-full sm:w-auto"
                            >
                                {sendingContact ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Kết bạn
                                    </>
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Group Management Panel */}
            {isGroup && (
                <GroupManagementPanel
                    conversationId={id}
                    open={showGroupPanel}
                    onOpenChange={setShowGroupPanel}
                />
            )}
        </div>
    );
}
