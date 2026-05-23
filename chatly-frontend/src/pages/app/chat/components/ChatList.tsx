import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
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
    ShieldOff,
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
import type { NotificationEvent } from "@/types/notification";
import type { UserResponse } from "@/types/auth";
import { toast } from "sonner";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { AddFriendDialog } from "@/pages/app/contact/components/AddFriendDialog";
import { useNotificationStore } from "@/store/notification.store";
import { useUiStore } from "@/store/ui.store";
import { useContactStore } from "@/store/contact.store";

function formatZaloTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Calculate day difference based on current date, not 24h interval
    // So "Yesterday" works even if it's only 1 hour ago but past midnight
    // But simpler:
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
        if (diffMins <= 0) return "Just now";
        return `${diffMins} min`;
    }
    if (diffHours < 24) {
        return `${diffHours} hour`;
    }
    if (diffDays < 7) {
        return `${diffDays} day`;
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
}

function stripHtmlToText(content: string): string {
    if (!content) return "";
    if (!/<[a-z][\s\S]*>/i.test(content)) {
        return content;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

const PREVIEW_MAX_LENGTH = 40;

function getFirstMeaningfulChunk(content: string): string {
    if (!content) return "";

    if (!/<[a-z][\s\S]*>/i.test(content)) {
        return content.split(/\r?\n+/).map((line) => line.trim()).find(Boolean) ?? "";
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    const firstItem = doc.querySelector("li");
    if (firstItem?.textContent?.trim()) {
        return firstItem.textContent.trim();
    }

    const firstParagraph = doc.querySelector("p");
    if (firstParagraph?.textContent?.trim()) {
        return firstParagraph.textContent.trim();
    }

    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function truncatePreview(text: string): string {
    const normalizedText = text.trim();
    if (normalizedText.length <= PREVIEW_MAX_LENGTH) {
        return normalizedText;
    }
    return `${normalizedText.slice(0, PREVIEW_MAX_LENGTH).trimEnd()}...`;
}

function formatCallPreview(content: string): string {
    try {
        const callData = JSON.parse(content) as {
            status?: string;
            callType?: string;
        };
        const isMissed =
            callData.status === "MISSED" || callData.status === "REJECTED";
        const isVideo = callData.callType === "VIDEO";
        if (isMissed) {
            return isVideo ? "📵 Missed video call" : "📵 Missed audio call";
        }
        return isVideo ? "🎥 Video call" : "📞 Audio call";
    } catch {
        return "📞 Call";
    }
}

function formatLastMessagePreview(
    lastMessage: ConversationResponse["lastMessage"],
): string {
    if (!lastMessage) {
        return "No messages yet";
    }

    if (lastMessage.type === "IMAGE") return "📷 Photo";
    if (lastMessage.type === "FILE")
        return `📎 ${stripHtmlToText(lastMessage.content) || "File"}`;
    if (lastMessage.type === "STICKER") return "🎭 Sticker";
    if (lastMessage.type === "VCARD") return "📇 Contact card";
    if (lastMessage.type === "GIF") return "🎬 GIF";
    if (lastMessage.type === "CALL") return formatCallPreview(lastMessage.content);

    const text = truncatePreview(getFirstMeaningfulChunk(lastMessage.content));
    return text || "Message";
}

function upsertConversation(
    conversations: ConversationResponse[],
    conversation: ConversationResponse,
): ConversationResponse[] {
    if (!conversations.some((item) => item.id === conversation.id)) {
        return [conversation, ...conversations];
    }

    return conversations.map((item) =>
        item.id === conversation.id ? conversation : item,
    );
}

function isRemovedFromGroupNotification(notification: NotificationEvent["notification"]): boolean {
    if (notification.type !== "SYSTEM") {
        return false;
    }
    const content = (notification.content ?? "").toLowerCase();
    return content.includes("removed from");
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
    const addNotification = useNotificationStore((s) => s.addNotification);
    const { fetchContacts, loaded: contactsLoaded, getBlockDirection } = useContactStore();

    // Lazy-initialize contact store once per session for blocked indicators
    useEffect(() => {
        if (!contactsLoaded && currentUser?.id) {
            fetchContacts();
        }
    }, [currentUser?.id, contactsLoaded, fetchContacts]);
    const unreadMsgNotifications = useMemo(() => 
        notifications.filter((n) => n.type === "NEW_MESSAGE" && !n.read),
    [notifications]);
    const convPrefs = useConversationPrefsStore((s) => s.prefs);
    const { setPin: storeSetPin, setMute: storeSetMute, setCategory: storeSetCategory } = useConversationPrefsStore();
    const conversationIdsKey = [...conversations]
        .map((conv) => conv.id)
        .sort()
        .join("|");

    const refreshConversations = useCallback(async () => {
        const response = await conversationService.getMyConversations();
        setConversations(response.result ?? []);
    }, []);

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
                // Fetch conversations and users in parallel
                const [convsRes, usersRes] = await Promise.all([
                    conversationService.getMyConversations(),
                    userService.getAll(),
                ]);
                setConversations(convsRes.result ?? []);
                setUsers(usersRes.result ?? []);
            } catch (err) {
                console.error("Error loading conversation list:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser?.id) return;

        let disposed = false;

        const setup = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            await socketService.connect(token);
            if (disposed) return;

            const client = socketService.getClient();
            if (!client) return;

            const subscription = client.subscribe(
                "/user/queue/notifications",
                (payload) => {
                    const event = JSON.parse(payload.body) as NotificationEvent;
                    addNotification(event.notification);

                    if (event.notification.type === "NEW_MESSAGE") {
                        processedNotifIdsRef.current.add(event.notification.id);
                        void refreshConversations();
                        return;
                    }

                    if (event.notification.type === "GROUP_INVITE") {
                        processedNotifIdsRef.current.add(event.notification.id);
                        void refreshConversations();
                        return;
                    }

                    if (isRemovedFromGroupNotification(event.notification) && event.notification.referenceId) {
                        processedNotifIdsRef.current.add(event.notification.id);
                        setConversations((prev) =>
                            prev.filter((conv) => conv.id !== event.notification.referenceId),
                        );
                    }
                },
            );

            return () => subscription.unsubscribe();
        };

        const cleanupPromise = setup();

        return () => {
            disposed = true;
            cleanupPromise.then((cleanup) => cleanup?.());
        };
    }, [addNotification, currentUser?.id, refreshConversations]);

    // Notifications keep previews fresh when the list subscription misses a message.
    useEffect(() => {
        const newMsgNotifs = notifications.filter(
            (n) =>
                (
                    n.type === "NEW_MESSAGE"
                    || n.type === "GROUP_INVITE"
                    || (isRemovedFromGroupNotification(n) && Boolean(n.referenceId))
                )
                && n.referenceId
                && !processedNotifIdsRef.current.has(n.id),
        );
        if (newMsgNotifs.length === 0) return;

        for (const notif of newMsgNotifs) {
            processedNotifIdsRef.current.add(notif.id);
            const conversationId = notif.referenceId;
            if (!conversationId) continue;

            if (isRemovedFromGroupNotification(notif)) {
                setConversations((current) =>
                    current.filter((conversation) => conversation.id !== conversationId),
                );
                continue;
            }

            conversationService
                .getById(conversationId)
                .then((response) => {
                    if (!response.result) return;
                    setConversations((current) =>
                        upsertConversation(current, response.result),
                    );
                    void refreshConversations();
                })
                .catch(() => {});
        }
    }, [notifications, refreshConversations]);

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

                    // Handle GROUP_UPDATE / ROLE_UPDATED actions - update group info
                    if (event.action === "GROUP_UPDATE" || event.action === "ROLE_UPDATED") {
                        const updatedConv = event.conversationData;
                        if (!updatedConv) return;

                        if (!updatedConv.participantIds.includes(currentUser.id)) {
                            setConversations((prev) =>
                                prev.filter((conversation) => conversation.id !== updatedConv.id),
                            );
                            return;
                        }

                        setConversations((prev) => upsertConversation(prev, updatedConv));
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
                    "Cannot subscribe to real-time conversations:",
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
        const result = conversations.filter((conv) => {
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
            toast.success("Conversation deleted");
        } catch (error) {
            console.error("Delete conversation error:", error);
            toast.error("Could not delete conversation. Please try again.");
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

        // Blocked indicator (Phase 3.1)
        const otherId = !isGroup
            ? conv.participantIds.find((id) => id !== currentUser?.id)
            : undefined;
        const blockDirection =
            otherId && currentUser?.id
                ? getBlockDirection(currentUser.id, otherId)
                : null;

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
                                toast.warning("You can only pin up to 5 conversations");
                                return;
                            }
                            storeSetPin(conv.id, !isPinned);
                            toast.success(isPinned ? "Conversation unpinned" : "Conversation pinned");
                        }}
                    >
                        <Pin className="mr-2 h-4 w-4" />
                        <span>{isPinned ? "Unpin" : "Pin"}</span>
                    </Item>

                    <Sub>
                        <SubTrigger>
                            <Tags className="mr-2 h-4 w-4" />
                            <span>Category</span>
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
                            toast.success(isMuted ? "Notifications turned on" : "Notifications silenced");
                        }}
                    >
                        <BellOff className="mr-2 h-4 w-4" />
                        <span>{isMuted ? "Turn on notifications" : "Silence notifications"}</span>
                    </Item>

                    <Separator />

                    <Item disabled>
                        <Flag className="mr-2 h-4 w-4" />
                        <span>Report</span>
                    </Item>

                    <Item
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete conversation</span>
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
                                    "flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors rounded-lg mx-2",
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
                                                        if (!meta) return null;
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
                                        {blockDirection === "I_BLOCKED" && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <ShieldOff size={13} className="text-destructive/60 shrink-0" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs px-2 py-1">
                                                        Blocked
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    {conv.updatedAt && (
                                        <span className="text-[12px] text-muted-foreground/80 whitespace-nowrap ml-2">
                                            {formatZaloTime(conv.updatedAt)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between min-w-0">
                                    <span className="text-[13px] text-muted-foreground/90 truncate block min-w-0 flex-1">
                                        {conv.lastMessage ? (
                                            <>
                                                {conv.lastMessage.senderId ===
                                                    currentUser?.id && (
                                                    <span>You: </span>
                                                )}
                                                {formatLastMessagePreview(
                                                    conv.lastMessage,
                                                )}
                                            </>
                                        ) : (
                                            "No messages yet"
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
                                    title="Options"
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
                        title="Open menu"
                    >
                        <Menu size={18} />
                    </Button>
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search"
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
                            title="Add friends"
                        >
                            <UserPlus size={16} />
                        </Button>
                        <Button
                            onClick={() => setCreateGroupOpen(true)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            title="Create Group"
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
                                        No conversations yet
                                    </p>
                                    <p className="text-[12px] text-center max-w-[200px] text-muted-foreground/80">
                                        Search for friends or create a group to
                                        start chatting.
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
