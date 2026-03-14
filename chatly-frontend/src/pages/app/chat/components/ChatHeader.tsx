import { Phone, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ChatUser } from "@/types/message";
import { toast } from "sonner";

interface ChatHeaderProps {
    user: ChatUser;
}

export function ChatHeader({ user }: ChatHeaderProps) {
    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm z-20">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>
                            {user.displayName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                        {user.displayName}
                    </h3>
                </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
                <Button
                    onClick={() => {
                        toast.info("Tính năng gọi video sẽ sớm ra mắt!");
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                >
                    <Video size={18} />
                </Button>
                <Button
                    onClick={() => {
                        toast.info("Tính năng gọi thoại sẽ sớm ra mắt!");
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                >
                    <Phone size={18} />
                </Button>
            </div>
        </header>
    );
}
