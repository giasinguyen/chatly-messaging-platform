import { useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    Search,
    UserPlus,
    UsersRound,
    Users,
    Tags,
    BellOff,
    Flag,
    Trash2,
    Pin,
    Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { conversationService } from "@/services/conversation.service";
import { socketService } from "@/services/socket.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { useConversationPrefsStore } from "@/store/conversationPrefs.store";
import {
    getConversationDisplayName,
    getConversationAvatar,
} from "@/utils/conversation";
import type { ConversationResponse } from "@/types/conversation";
import type { ChatEvent } from "@/types/message";
import type { UserResponse } from "@/types/auth";
import { toast } from "sonner";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { useNotificationStore } from "@/store/notification.store";
import { useUiStore } from "@/store/ui.store";

function formatZaloTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Tính số ngày chênh lệch dựa theo ngày hiện tại chứ không phải 24h
    // Để "ngày hôm qua" là kể cả cách 1 tiếng nhưng qua 0h
    // Nhưng đơn giản hơn:
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
        if (diffMins <= 0) return "Vừa xong";
        return `${diffMins} phút`;
    }
    if (diffHours < 24) {
        return `${diffHours} giờ`;
    }
    if (diffDays < 7) {
        return `${diffDays} ngày`;
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
}

export const ChatList = forwardRef(function ChatListComponent(_, ref) {
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<ConversationResponse[]>(
        [],
    );
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([]);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const toggleMobileDrawer = useUiStore((s) => s.toggleMobileDrawer);
    const notifications = useNotificationStore((s) => s.notifications);
    const unreadMsgNotifications = useMemo(() => 
        notifications.filter((n) => n.type === "NEW_MESSAGE" && !n.read),
    [notifications]);
    const convPrefs = useConversationPrefsStore((s) => s.prefs);
    const { setPin: storeSetPin, setMute: storeSetMute } = useConversationPrefsStore();
    const conversationIdsKey = [...conversations]
        .map((conv) => conv.id)
        .sort()
        .join("|");

    useImperativeHandle(ref, () => ({
        updateConversation: (updated: ConversationResponse) => {
            setConversations((prev) =>
                prev.map((conv) => (conv.id === updated.id ? updated : conv))
            );
        },
    }));

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch conversations và users song song
                const [convsRes, usersRes] = await Promise.all([
                    conversationService.getMyConversations(),
                    userService.getAll(),
                ]);
                setConversations(convsRes.result ?? []);
                setUsers(usersRes.result ?? []);
            } catch (err) {
                console.error("Lỗi load conversation list:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser?.id || conversations.length === 0) return;

        let disposed = false;

        const setup = async () => {
            try {
                const token = localStorage.getItem("access_token");
                if (!token) return;

                await socketService.connect(token);
                if (disposed) return;

                const client = socketService.getClient();
                if (!client) return;

                subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
                subscriptionsRef.current = conversations.map((conv) =>
                    client.subscribe(
                        `/topic/conversation.${conv.id}`,
                        (payload) => {
                            const event = JSON.parse(payload.body) as ChatEvent;

                            // Only update sidebar last-message preview for SEND actions
                            if (event.action !== "SEND") return;
                            const message = event.message;

                            setConversations((prev) => {
                                const target = prev.find(
                                    (item) =>
                                        item.id === message.conversationId,
                                );
                                if (!target) return prev;

                                const updatedConversation: ConversationResponse =
                                    {
                                        ...target,
                                        lastMessage: {
                                            senderId: message.senderId,
                                            content: message.content,
                                            type: message.type,
                                            timestamp: message.createdAt,
                                        },
                                        updatedAt: message.createdAt,
                                    };

                                return [
                                    updatedConversation,
                                    ...prev.filter(
                                        (item) =>
                                            item.id !== message.conversationId,
                                    ),
                                ];
                            });
                        },
                    ),
                );
            } catch (error) {
                console.error(
                    "Không thể subscribe realtime conversations:",
                    error,
                );
            }
        };

        setup();

        return () => {
            disposed = true;
            subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
            subscriptionsRef.current = [];
        };
    }, [currentUser?.id, conversations.length, conversationIdsKey]);

    const filteredConversations = useMemo(() => {
        let result = conversations.filter((conv) => {
            if (!searchQuery.trim()) return true;
            const prefs = convPrefs[conv.id] ?? {};
            const baseName = currentUser
                ? getConversationDisplayName(conv, currentUser.id, users)
                : "";
            const displayName = prefs.nickname || baseName;
            return displayName.toLowerCase().includes(searchQuery.toLowerCase());
        });

        // Sort by local pinned status (pinned first), then by updatedAt
        result.sort((a, b) => {
            const aPinned = (convPrefs[a.id]?.isPinned ?? a.isPinned) ? 1 : 0;
            const bPinned = (convPrefs[b.id]?.isPinned ?? b.isPinned) ? 1 : 0;
            if (aPinned !== bPinned) return bPinned - aPinned;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        return result;
    }, [conversations, searchQuery, currentUser, users, convPrefs]);

    const renderSkeleton = () =>
        Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="flex items-center gap-3 px-4 py-3 opacity-60">
                <div className="h-12 w-12 rounded-full bg-border animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-[60%] rounded bg-border animate-pulse" />
                    <div className="h-3 w-[80%] rounded bg-border/60 animate-pulse" />
                </div>
            </div>
        ));

    const handleDeleteConversation = async (id: string) => {
        try {
            await conversationService.delete(id);
            setConversations((prev) => prev.filter((c) => c.id !== id));
            toast.success("Đã xoá hội thoại");
        } catch (error) {
            console.error("Delete conversation error:", error);
            toast.error("Không thể xoá hội thoại. Vui lòng thử lại.");
        }
    };

    const renderConversationItem = (conv: ConversationResponse) => {
        const prefs = convPrefs[conv.id] ?? {};
        const baseName = currentUser
            ? getConversationDisplayName(conv, currentUser.id, users)
            : "...";
        // Use nickname from local prefs, then server, then original name
        const displayName = prefs.nickname ?? conv.nickname ?? baseName;
        const avatarUrl = currentUser
            ? getConversationAvatar(conv, currentUser.id, users)
            : undefined;
        const initials = displayName.charAt(0).toUpperCase();
        const isGroup = conv.type === "GROUP";
        const unreadCount = unreadMsgNotifications.filter(
            (n) => n.referenceId === conv.id
        ).length;
        const isPinned = prefs.isPinned ?? conv.isPinned ?? false;
        const isMuted = prefs.isMuted ?? conv.isMuted ?? false;

        return (
            <ContextMenu key={conv.id}>
                <ContextMenuTrigger asChild>
                    <div className="w-full">
                        <NavLink
                            to={`/chat/${conv.id}`}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors w-full rounded-lg mx-2",
                                    isActive
                                        ? "bg-brand/20 border border-brand/30"
                                        : "hover:bg-muted/40",
                                )
                            }
                        >
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage
                                        src={avatarUrl}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="bg-muted text-lg text-muted-foreground font-medium">
                                        {isGroup ? (
                                            <Users size={22} />
                                        ) : (
                                            initials
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                {isGroup && (
                                    <span className="absolute -bottom-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-brand flex items-center justify-center ring-2 ring-background">
                                        <Users
                                            size={10}
                                            className="text-white"
                                        />
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="font-normal truncate block text-[15px] text-foreground">
                                            {displayName}
                                        </span>
                                        {isPinned && <Pin size={14} className="text-brand shrink-0" />}
                                        {isMuted && <BellOff size={14} className="text-muted-foreground shrink-0" />}
                                    </div>
                                    {conv.updatedAt && (
                                        <span className="text-[12px] text-muted-foreground/80 whitespace-nowrap ml-2">
                                            {formatZaloTime(conv.updatedAt)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-muted-foreground/90 truncate block">
                                        {conv.lastMessage ? (
                                            <>
                                                {conv.lastMessage.senderId ===
                                                    currentUser?.id && (
                                                    <span>Bạn: </span>
                                                )}
                                                {conv.lastMessage.type ===
                                                "IMAGE"
                                                    ? "📷 Hình ảnh"
                                                    : conv.lastMessage.type ===
                                                        "FILE"
                                                      ? "📎 File"
                                                      : conv.lastMessage
                                                              .type ===
                                                          "STICKER"
                                                        ? "🎭 Sticker"
                                                        : conv.lastMessage
                                                              .content}
                                            </>
                                        ) : (
                                            "Chưa có tin nhắn"
                                        )}
                                    </span>
                                    {unreadCount > 0 && (
                                        <span className="min-w-[18px] h-[18px] shrink-0 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center px-1 ml-2">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </NavLink>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    <ContextMenuItem
                        onClick={() => {
                            const pinnedCount = Object.values(convPrefs).filter((p) => p.isPinned).length;
                            if (!isPinned && pinnedCount >= 5) {
                                toast.warning("Chỉ có thể ghim tối đa 5 hội thoại");
                                return;
                            }
                            storeSetPin(conv.id, !isPinned);
                            toast.success(isPinned ? "Đã bỏ ghim hội thoại" : "Đã ghim hội thoại");
                        }}
                    >
                        <Pin className="mr-2 h-4 w-4" />
                        <span>{isPinned ? "Bỏ ghim" : "Ghim"}</span>
                    </ContextMenuItem>

                    <ContextMenuSub>
                        <ContextMenuSubTrigger>
                            <Tags className="mr-2 h-4 w-4" />
                            <span>Phân loại</span>
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-40">
                            <ContextMenuItem
                                onClick={() =>
                                    toast.info("Development in progress...")
                                }
                            >
                                Khách hàng
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() =>
                                    toast.info("Development in progress...")
                                }
                            >
                                Gia đình
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() =>
                                    toast.info("Development in progress...")
                                }
                            >
                                Công việc
                            </ContextMenuItem>
                        </ContextMenuSubContent>
                    </ContextMenuSub>

                    <ContextMenuItem
                        onClick={() => {
                            storeSetMute(conv.id, !isMuted);
                            toast.success(isMuted ? "Đã bật thông báo" : "Đã tắt thông báo");
                        }}
                    >
                        <BellOff className="mr-2 h-4 w-4" />
                        <span>{isMuted ? "Bật thông báo" : "Tắt thông báo"}</span>
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem disabled>
                        <Flag className="mr-2 h-4 w-4" />
                        <span>Báo xấu</span>
                    </ContextMenuItem>

                    <ContextMenuItem
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                        onClick={(e) => {
                            // Tránh trigger NavLink nếu có click propagation
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Xoá hội thoại</span>
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    return (
        <>
            <aside className="w-full md:w-85 lg:w-[350px] flex flex-col border-r border-border shrink-0 h-full overflow-hidden bg-background dark:bg-[#22252b]">
                {/* Search Header */}
                <div className="px-4 py-4 flex items-center gap-2 border-b border-border/50 bg-muted/10">
                    <Button
                        onClick={toggleMobileDrawer}
                        variant="ghost"
                        size="icon"
                        className="md:hidden h-8 w-8 rounded-full shrink-0 -ml-2"
                        title="Mở menu"
                    >
                        <Menu size={18} />
                    </Button>
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 bg-muted/30 border-border/40 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand rounded-full text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            onClick={() =>
                                toast.info("Development in progress...")
                            }
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                        >
                            <UserPlus size={16} />
                        </Button>
                        <Button
                            onClick={() => setCreateGroupOpen(true)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            title="Tạo nhóm chat"
                        >
                            <UsersRound size={16} />
                        </Button>
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="flex flex-col py-1">
                            {loading ? (
                                renderSkeleton()
                            ) : filteredConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
                                    <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-2">
                                        <UsersRound
                                            size={40}
                                            strokeWidth={1.5}
                                            className="text-primary/40"
                                        />
                                    </div>
                                    <p className="text-[14px] font-medium text-foreground/70">
                                        Chưa có cuộc trò chuyện nào
                                    </p>
                                    <p className="text-[12px] text-center max-w-[200px] text-muted-foreground/80">
                                        Hãy tìm kiếm hoặc tạo nhóm để bắt đầu nhắn tin nhé.
                                    </p>
                                </div>
                            ) : (
                                filteredConversations.map(
                                    renderConversationItem,
                                )
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </aside>
            <CreateGroupDialog
                open={createGroupOpen}
                onOpenChange={setCreateGroupOpen}
                onCreated={(conv) => {
                    setConversations((prev) => {
                        if (prev.some((c) => c.id === conv.id)) return prev;
                        return [conv, ...prev];
                    });
                    navigate(`/chat/${conv.id}`);
                }}
            />
        </>
    );
});
