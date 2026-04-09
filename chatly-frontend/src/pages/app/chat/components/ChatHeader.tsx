import { Phone, Video, Users, ChevronLeft, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PresenceIndicator } from "@/components/customize/PresenceIndicator";
import type { ChatUser } from "@/types/message";
import { toast } from "sonner";

interface ChatHeaderProps {
    user: ChatUser;
    onOpenProfile: () => void;
    isGroup?: boolean;
    onOpenGroupPanel?: () => void;
    onToggleSearch?: () => void;
    presenceStatus?: "ONLINE" | "OFFLINE" | string;
    lastSeen?: string | null;
    onBack?: () => void;
}

export function ChatHeader({ user, onOpenProfile, isGroup, onOpenGroupPanel, onToggleSearch, presenceStatus, lastSeen, onBack }: ChatHeaderProps) {
    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-2 sm:px-4 shrink-0 bg-background">
            <div className="flex items-center">
                {onBack && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="md:hidden h-9 w-9 mr-1"
                    >
                        <ChevronLeft size={24} />
                    </Button>
                )}
                <button
                    type="button"
                    onClick={onOpenProfile}
                    className="flex items-center gap-3 rounded-md px-2 py-1 text-left transition hover:bg-muted/60"
                >
                    <div className="relative">
                    <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>
                            {user.displayName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    {!isGroup && presenceStatus && (
                        <span className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator status={presenceStatus} size="sm" />
                        </span>
                    )}
                </div>
                <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                        {user.displayName}
                    </h3>
                    {!isGroup && presenceStatus && (
                        <PresenceIndicator
                            status={presenceStatus}
                            lastSeen={lastSeen}
                            showLabel
                            className="mt-0.5"
                        />
                    )}
                </div>
            </button>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
                {isGroup && onOpenGroupPanel && (
                    <Button
                        onClick={onOpenGroupPanel}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        title="Quản lý nhóm"
                    >
                        <Users size={18} />
                    </Button>
                )}
                <Button
                    onClick={onToggleSearch}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    title="Tìm kiếm tin nhắn"
                >
                    <Search size={18} />
                </Button>
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
