import { Phone, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ChatUser } from "@/types/message";
import { toast } from "sonner";

interface ChatHeaderProps {
    user: ChatUser;
    onOpenProfile: () => void;
}

export function ChatHeader({ user, onOpenProfile }: ChatHeaderProps) {
    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0" style={{ background: '#1b1c1d' }}>
            <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-3 rounded-md px-1 py-1 text-left transition hover:bg-muted/60"
            >
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
            </button>

            <div className="flex items-center gap-1 text-muted-foreground">
                <Button
                    onClick={() => {
                        toast.info("Development in progress...");
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                >
                    <Video size={18} />
                </Button>
                <Button
                    onClick={() => {
                        toast.info("Development in progress...");
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
