import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HOME_PEOPLE_SUGGESTIONS } from "@/constants/homeSidebar";
import type { UserResponse } from "@/types/auth";

interface HomeRightSidebarProps {
    user: UserResponse | null;
    hasMyStories: boolean;
    onOpenProfile: () => void;
}

export function HomeRightSidebar({
    user,
    hasMyStories,
    onOpenProfile,
}: HomeRightSidebarProps) {
    return (
        <aside className="sticky top-0 hidden h-screen w-100 shrink-0 overflow-y-auto pt-8 pr-8 pl-6 xl:block hide-scrollbar">
            <div className="mb-8 flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
                <div
                    className="flex cursor-pointer items-center gap-3"
                    onClick={onOpenProfile}
                >
                    <div
                        className={cn(
                            "rounded-full p-0.5",
                            hasMyStories
                                ? "bg-linear-to-tr from-brand via-blue-500 to-cyan-400"
                                : "bg-transparent",
                        )}
                    >
                        <div className="rounded-full bg-background p-0.5">
                            <Avatar className="h-12 w-12">
                                <AvatarImage
                                    src={user?.avatarUrl}
                                    alt={user?.displayName || "Your Profile"}
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-linear-to-tr from-pink-400 to-indigo-500 text-sm font-semibold text-white">
                                    {user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">
                            {user?.displayName || "current_user"}
                        </h4>
                        <p className="text-[13px] text-muted-foreground">
                            {user?.email || "user@example.com"}
                        </p>
                    </div>
                </div>
                <button className="border-none bg-transparent text-[12px] font-semibold text-brand transition-colors hover:text-brand-dark">
                    Switch
                </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-muted-foreground">
                    People you may know
                </h3>
                <button className="text-[12px] font-semibold text-foreground transition-colors hover:text-brand">
                    See All
                </button>
            </div>

            <div className="space-y-2 rounded-2xl border border-border bg-card/70 p-3">
                {HOME_PEOPLE_SUGGESTIONS.map((suggestion) => (
                    <div
                        key={suggestion.id}
                        className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/70"
                    >
                        <Avatar className="size-10 shrink-0">
                            <AvatarImage
                                src={suggestion.avatarUrl}
                                alt={suggestion.displayName}
                                className="object-cover"
                            />
                            <AvatarFallback className="bg-muted text-sm font-semibold text-muted-foreground">
                                {suggestion.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                                {suggestion.displayName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                @{suggestion.username} - {suggestion.mutualFriends} mutual friends
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl px-3 text-xs"
                        >
                            Add
                        </Button>
                    </div>
                ))}
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
                © 2027 ChatLy - The Challenger Team
            </p>
        </aside>
    );
}
