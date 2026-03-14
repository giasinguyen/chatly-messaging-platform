import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, UserPlus, UsersRound, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import {
    getConversationDisplayName,
    getConversationAvatar,
} from "@/utils/conversation";
import type { ConversationResponse } from "@/types/conversation";
import type { UserResponse } from "@/types/auth";
import { toast } from "sonner";

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
    }, []);

    const filteredConversations = conversations.filter((conv) => {
        if (!searchQuery.trim()) return true;
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
            <NavLink
                key={conv.id}
                to={`/chat/${conv.id}`}
                className={({ isActive }) =>
                    cn(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors relative border-l-2",
                        isActive
                            ? "bg-brand/10 border-brand"
                            : "hover:bg-muted/50 border-transparent",
                    )
                }
            >
                {/* Avatar */}
                <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 border border-border/50">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback>
                            {isGroup ? (
                                <Users
                                    size={20}
                                    className="text-muted-foreground"
                                />
                            ) : (
                                initials
                            )}
                        </AvatarFallback>
                    </Avatar>
                    {isGroup && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-brand flex items-center justify-center">
                            <Users size={9} className="text-white" />
                        </span>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium truncate block text-sm text-foreground">
                            {displayName}
                        </span>
                        {conv.updatedAt && (
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                                {new Date(conv.updatedAt).toLocaleDateString(
                                    "vi-VN",
                                    {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    },
                                )}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate block">
                            {conv.lastMessage
                                ? conv.lastMessage.type === "IMAGE"
                                    ? "📷 Hình ảnh"
                                    : conv.lastMessage.type === "FILE"
                                      ? "📎 File"
                                      : conv.lastMessage.type === "STICKER"
                                        ? "🎭 Sticker"
                                        : conv.lastMessage.content
                                : "Chưa có tin nhắn"}
                        </span>
                    </div>
                </div>
            </NavLink>
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
