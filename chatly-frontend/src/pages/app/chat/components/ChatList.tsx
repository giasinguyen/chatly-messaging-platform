import { Search, UserPlus, UsersRound, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { chatList, type ChatSnippet } from "@/mocks/chat";

export function ChatList() {
    // Combine chats since we removed the tabs
    const allChats = [...chatList];

    const renderChatItem = (chat: ChatSnippet) => (
        <div
            key={chat.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors relative"
        >
            <div className="relative">
                <Avatar className="h-12 w-12 border border-border/50">
                    <AvatarImage src={chat.user.avatar} />
                    <AvatarFallback>{chat.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {chat.user.status === "online" && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                )}
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-foreground truncate block text-sm">
                        {chat.user.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                        {chat.timestamp}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate block">
                        {chat.lastMessage}
                    </span>
                    {chat.unreadCount && (
                        <Badge
                            variant="destructive"
                            className="ml-2 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] rounded-full"
                        >
                            {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <aside className="w-[340px] flex flex-col border-r border-border bg-card shrink-0 z-10">
            {/* Search Header */}
            <div className="px-4 py-4 flex items-center gap-2 border-b border-border/50">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm"
                        className="h-8 pl-8 bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand rounded-full text-sm"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-foreground transition-colors">
                        <UserPlus size={16} />
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-foreground transition-colors">
                        <UsersRound size={16} />
                    </button>
                </div>
            </div>

            {/* Filter Header (No Tabs) */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-border/50 h-10">
                <div className="flex items-center gap-2">
                    <button className="h-6 flex items-center justify-center text-xs font-medium text-muted-foreground hover:text-foreground">
                        Phân loại{" "}
                        <ChevronLeft className="h-3 w-3 ml-1 -rotate-90" />
                    </button>
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="flex flex-col py-1">
                        {allChats.map(renderChatItem)}
                    </div>
                </ScrollArea>
            </div>
        </aside>
    );
}

