import { MessageCircle, UserPlus, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface HomeHoverUser {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    subtitle?: string;
}

interface HomeUserHoverCardProps {
    user: HomeHoverUser;
    mode: "friend" | "suggestion";
    isPending?: boolean;
    hasRequested?: boolean;
    onViewProfile: () => void;
    onMessage?: () => void;
    onAddFriend?: () => void;
}

export function HomeUserHoverCard({
    user,
    mode,
    isPending = false,
    hasRequested = false,
    onViewProfile,
    onMessage,
    onAddFriend,
}: HomeUserHoverCardProps) {
    return (
        <div className="pointer-events-none absolute top-full left-0 z-50 w-80 pt-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
            <div className="rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl">
                <div className="flex items-center gap-3">
                    <Avatar className="size-16 shrink-0">
                        <AvatarImage
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="object-cover"
                        />
                        <AvatarFallback className="bg-muted text-lg font-semibold text-muted-foreground">
                            {user.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                        <h4 className="truncate text-lg font-bold text-foreground">
                            {user.displayName}
                        </h4>
                        <p className="truncate text-sm text-muted-foreground">
                            {user.subtitle ?? `@${user.username}`}
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-lg"
                        onClick={onViewProfile}
                    >
                        <UserRound className="mr-2 size-4" />
                        View profile
                    </Button>

                    {mode === "friend" ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-9 rounded-lg"
                            onClick={onMessage}
                        >
                            <MessageCircle className="mr-2 size-4" />
                            Message
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            variant={hasRequested ? "secondary" : "default"}
                            disabled={isPending || hasRequested}
                            className="h-9 rounded-lg"
                            onClick={onAddFriend}
                        >
                            <UserPlus className="mr-2 size-4" />
                            {hasRequested ? "Requested" : "Add friend"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
