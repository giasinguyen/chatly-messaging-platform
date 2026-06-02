import { MessageCircle, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface HomeHoverUser {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    subtitle?: string;
    role?: string;
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
    const { t } = useTranslation();
    return (
        <div className="absolute inset-x-0 top-full z-50 mt-1 hidden group-hover:block">
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
                        <div className="flex min-w-0 items-center gap-1.5">
                            <h4 className="truncate text-lg font-bold text-foreground">
                                {user.displayName}
                            </h4>
                            {user.role === "ADMIN" && <AdminBadge />}
                        </div>
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
                        {t("home.view_profile")}
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
                            {t("home.message")}
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
                            {hasRequested ? t("home.requested") : t("home.add_friend")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
