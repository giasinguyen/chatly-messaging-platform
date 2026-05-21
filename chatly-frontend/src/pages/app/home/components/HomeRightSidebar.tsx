import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
                <h3 className="font-semibold text-muted-foreground">Suggested for you</h3>
                <button className="text-[12px] font-semibold text-foreground transition-colors hover:text-brand">
                    See All
                </button>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-card/70 p-4">
                <p className="text-sm font-medium text-foreground">
                    Suggestions will appear soon
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Follow more users and interact with posts to improve recommendations.
                </p>
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
                © 2027 ChatLy - The Challenger Team
            </p>
        </aside>
    );
}
