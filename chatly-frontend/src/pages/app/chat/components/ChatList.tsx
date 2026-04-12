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
    MoreHorizontal,
    Check,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { conversationService } from "@/services/conversation.service";
import { socketService } from "@/services/socket.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { useConversationPrefsStore, CATEGORY_META } from "@/store/conversationPrefs.store";
import type { ConversationCategory } from "@/store/conversationPrefs.store";
import {
    getConversationDisplayName,
    getConversationAvatar,
} from "@/utils/conversation";
import type { ConversationResponse } from "@/types/conversation";
import type { ChatEvent } from "@/types/message";
import type { UserResponse } from "@/types/auth";
import { toast } from "sonner";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { AddFriendDialog } from "@/pages/app/contact/components/AddFriendDialog";
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
    const [addFriendOpen, setAddFriendOpen] = useState(false);
    const subscriptionsRef = useRef<Map<string, { unsubscribe: () => void }>>(new Map());
    const processedNotifIdsRef = useRef<Set<string>>(new Set());
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const toggleMobileDrawer = useUiStore((s) => s.toggleMobileDrawer);
    const notifications = useNotificationStore((s) => s.notifications);
    const unreadMsgNotifications = useMemo(() => 
        notifications.filter((n) => n.type === "NEW_MESSAGE" && !n.read),
    [notifications]);
    const convPrefs = useConversationPrefsStore((s) => s.prefs);
    const { setPin: storeSetPin, setMute: storeSetMute, setCategory: storeSetCategory } = useConversationPrefsStore();
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

    // When a NEW_MESSAGE notification arrives for a conversation not yet in the list
    // (e.g. someone starts a brand-new conversation), fetch that conversation and add it.
    useEffect(() => {
        const newMsgNotifs = notifications.filter(
            (n) => n.type === "NEW_MESSAGE" && n.referenceId && !processedNotifIdsRef.current.has(n.id),
        );
        if (newMsgNotifs.length === 0) return;

        for (const notif of newMsgNotifs) {
            processedNotifIdsRef.current.add(notif.id);
            const convId = notif.referenceId!;
            setConversations((prev) => {
                if (prev.some((c) => c.id === convId)) return prev;
                // New conversation not in list — fetch and prepend
                conversationService.getById(convId).then((res) => {
                    if (res.result) {
                        setConversations((p) => {
                            if (p.some((c) => c.id === res.result.id)) return p;
                            return [res.result, ...p];
                        });
                    }
                }).catch(() => {});
                return prev;
            });
        }
    }, [notifications]);

    useEffect(() => {
        if (!currentUser?.id || conversations.length === 0) return;

        let disposed = false;

        const createSubscription = (client: import("@stomp/stompjs").Client, conv: ConversationResponse) => {
            return client.subscribe(
                `/topic/conversation.${conv.id}`,
                (payload) => {
                    const event = JSON.parse(payload.body) as ChatEvent;

                    // Handle SEND actions - update last message preview
                    if (event.action === "SEND") {
                        const message = event.message;
                        if (!message) return;

                        setConversations((prev) => {
                            const target = prev.find(
                                (item) => item.id === message.conversationId,
                            );
                            if (!target) return prev;

                            const updatedConversation: ConversationResponse = {
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
                                    (item) => item.id !== message.conversationId,
                                ),
                            ];
                        });
                        return;
                    }

                    // Handle GROUP_UPDATE actions - update group info (name, avatar, etc)
                    if (event.action === "GROUP_UPDATE") {
                        const updatedConv = event.conversationData;
                        if (!updatedConv) return;

                        setConversations((prev) =>
                            prev.map((c) =>
                                c.id === updatedConv.id ? updatedConv : c
                            )
                        );
                        return;
                    }
                },
            );
        };

        const setup = async () => {
            try {
                const token = localStorage.getItem("access_token");
                if (!token) return;

                await socketService.connect(token);
                if (disposed) return;

                const client = socketService.getClient();
                if (!client) return;

                const currentIds = new Set(conversations.map((c) => c.id));
                const subscribedIds = new Set(subscriptionsRef.current.keys());

                // Subscribe to new conversations
                for (const conv of conversations) {
                    if (!subscribedIds.has(conv.id)) {
                        subscriptionsRef.current.set(conv.id, createSubscription(client, conv));
                    }
                }

                // Unsubscribe from removed conversations
                for (const id of subscribedIds) {
                    if (!currentIds.has(id)) {
                        subscriptionsRef.current.get(id)?.unsubscribe();
                        subscriptionsRef.current.delete(id);
                    }
                }
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
            subscriptionsRef.current.clear();
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
        const categories: ConversationCategory[] = prefs.categories ?? [];

        const menuContent = (isDropdown: boolean) => {
            const Item = isDropdown ? DropdownMenuItem : ContextMenuItem;
            const Separator = isDropdown ? DropdownMenuSeparator : ContextMenuSeparator;
            const Sub = isDropdown ? DropdownMenuSub : ContextMenuSub;
            const SubTrigger = isDropdown ? DropdownMenuSubTrigger : ContextMenuSubTrigger;
            const SubContent = isDropdown ? DropdownMenuSubContent : ContextMenuSubContent;

            return (
                <>
                    <Item
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
                    </Item>

                    <Sub>
                        <SubTrigger>
                            <Tags className="mr-2 h-4 w-4" />
                            <span>Phân loại</span>
                        </SubTrigger>
                        <SubContent className="w-48">
                            {(Object.entries(CATEGORY_META) as [ConversationCategory, { label: string; color: string }][]).map(
                                ([key, meta]) => (
                                    <Item
                                        key={key}
                                        onClick={() => {
                                            const isSelected = categories.includes(key);
                                            // Single-select: deselect if same, otherwise select new
                                            storeSetCategory(conv.id, key, !isSelected);
                                        }}
                                    >
                                        <span
                                            className="mr-2 h-3 w-3 rounded-full shrink-0"
                                            style={{ background: meta.color }}
                                        />
                                        <span className="flex-1">{meta.label}</span>
                                        {categories.includes(key) && (
                                            <Check className="ml-1 h-3.5 w-3.5 text-foreground shrink-0" />
                                        )}
                                    </Item>
                                )
                            )}
                        </SubContent>
                    </Sub>

                    <Item
                        onClick={() => {
                            storeSetMute(conv.id, !isMuted);
                            toast.success(isMuted ? "Đã bật thông báo" : "Đã tắt thông báo");
                        }}
                    >
                        <BellOff className="mr-2 h-4 w-4" />
                        <span>{isMuted ? "Bật thông báo" : "Tắt thông báo"}</span>
                    </Item>

                    <Separator />

                    <Item disabled>
                        <Flag className="mr-2 h-4 w-4" />
                        <span>Báo xấu</span>
                    </Item>

                    <Item
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Xoá hội thoại</span>
                    </Item>
                </>
            );
        };

        return (
            <ContextMenu key={conv.id}>
                <ContextMenuTrigger asChild>
                    <div className="group w-full relative">
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
                            <div className="flex-1 overflow-hidden pr-6">
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className="font-normal truncate block text-[15px] text-foreground">
                                            {displayName}
                                        </span>
                                        {/* Category tag icons next to name */}
                                        {categories.length > 0 && (
                                            <TooltipProvider>
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    {categories.map((cat) => {
                                                        const meta = CATEGORY_META[cat];
                                                        return (
                                                            <Tooltip key={cat}>
                                                                <TooltipTrigger asChild>
                                                                    <span
                                                                        className="h-3 w-3 rounded-full shrink-0 cursor-default inline-block"
                                                                        style={{ background: meta.color }}
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="text-xs px-2 py-1">
                                                                    {meta.label}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    })}
                                                </div>
                                            </TooltipProvider>
                                        )}
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

                        {/* ... dropdown button — visible on group hover */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted/60 transition-opacity focus:outline-none focus:opacity-100"
                                    onClick={(e) => e.preventDefault()}
                                    title="Tuỳ chọn"
                                >
                                    <MoreHorizontal size={15} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-52" align="end">
                                {menuContent(true)}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    {menuContent(false)}
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
                            onClick={() => setAddFriendOpen(true)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            title="Thêm bạn bè"
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
            <AddFriendDialog
                open={addFriendOpen}
                onOpenChange={setAddFriendOpen}
            />
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
