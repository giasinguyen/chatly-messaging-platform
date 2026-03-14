import {
    Phone,
    Video,
    Search,
    Sidebar as SidebarIcon,
    MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@/mocks/chat";

interface ChatHeaderProps {
    user: User;
    isFriend: boolean;
}

const statusLabel: Record<User["status"], string> = {
    online: "Đang hoạt động",
    offline: "Không hoạt động",
    away: "Vắng mặt",
};

const statusColor: Record<User["status"], string> = {
    online: "bg-green-500",
    offline: "bg-muted-foreground/40",
    away: "bg-yellow-400",
};

export function ChatHeader({ user, isFriend }: ChatHeaderProps) {
    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm z-20">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                        {user.name}
                    </h3>
                </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Video size={18} />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Phone size={18} />
                </Button>
            </div>
        </header>
    );
}
