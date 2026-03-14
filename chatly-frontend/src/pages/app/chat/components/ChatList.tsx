import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
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
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import {
    getOtherParticipantId,
    getConversationDisplayName,
    getConversationAvatar,
} from "@/utils/conversation";
import type { ConversationResponse } from "@/types/conversation";
import type { UserResponse } from "@/types/auth";
import { toast } from "sonner";

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

export function ChatList() {
    const { user: currentUser } = useAuthStore();
    const [conversations, setConversations] = useState<ConversationResponse[]>(
        [],
    );
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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

    const filteredConversations = conversations.filter((conv) => {
        if (!searchQuery.trim()) return true;
        toast.info("Development in progress...");
        const displayName = currentUser
            ? getConversationDisplayName(conv, currentUser.id, users)
            : "";
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const renderSkeleton = () =>
        Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-12 w-12 rounded-full bg-muted/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-muted/60 animate-pulse" />
                    <div className="h-3 w-48 rounded bg-muted/40 animate-pulse" />
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
        const displayName = currentUser
            ? getConversationDisplayName(conv, currentUser.id, users)
            : "...";
        const avatarUrl = currentUser
            ? getConversationAvatar(conv, currentUser.id, users)
            : undefined;
        const initials = displayName.charAt(0).toUpperCase();
        const isGroup = conv.type === "GROUP";

        return (
            <ContextMenu key={conv.id}>
                <ContextMenuTrigger asChild>
                    <div className="w-full">
                        <NavLink
                            to={`/chat/${conv.id}`}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors w-full",
                                    isActive
                                        ? "bg-brand/10"
                                        : "hover:bg-muted/50",
                                )
                            }
                        >
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <Avatar className="h-[48px] w-[48px]">
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
                                    <span className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-brand flex items-center justify-center ring-[2px] ring-background">
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
                                    <span className="font-normal truncate block text-[15px] text-foreground">
                                        {displayName}
                                    </span>
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
                                </div>
                            </div>
                        </NavLink>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    <ContextMenuItem
                        onClick={() => toast.info("Development in progress...")}
                    >
                        <Pin className="mr-2 h-4 w-4" />
                        <span>Ghim</span>
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
                        onClick={() => toast.info("Development in progress...")}
                    >
                        <BellOff className="mr-2 h-4 w-4" />
                        <span>Tắt thông báo</span>
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
        <aside className="w-[340px] flex flex-col border-r border-border bg-card shrink-0 h-full overflow-hidden">
            {/* Search Header */}
            <div className="px-4 py-4 flex items-center gap-2 border-b border-border/50">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand rounded-full text-sm"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => toast.info("Development in progress...")}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                    >
                        <UserPlus size={16} />
                    </Button>
                    <Button
                        onClick={() => toast.info("Development in progress...")}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
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
                            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                <UsersRound size={36} className="opacity-30" />
                                <p className="text-sm">
                                    Chưa có cuộc trò chuyện nào
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map(renderConversationItem)
                        )}
                    </div>
                </ScrollArea>
            </div>
        </aside>
    );
}
