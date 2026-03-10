import {
    Phone,
    Video,
    Search,
    Sidebar as SidebarIcon,
    MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { User } from "@/mocks/chat";

interface ChatHeaderProps {
    user: User;
}

export function ChatHeader({ user }: ChatHeaderProps) {
    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm z-20">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {user.status === "online" && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
                    )}
                </div>
                <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                        {user.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground uppercase font-bold tracking-tight">
                            Người lạ
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            Không có nhóm chung
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Video size={18} />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Phone size={18} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 border-l border-border/50 ml-1 rounded-none"
                >
                    <Search size={18} />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <SidebarIcon size={18} />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal size={18} />
                </Button>
            </div>
        </header>
    );
}

