import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { contactService } from "@/services/contact.service";
import type { UserResponse } from "@/types/auth";
import type { ContactSuggestionResponse } from "@/types/contact";
import type { UserRoleMap } from "@/services/userRoleService";
import { HomeFriendsPanel } from "./HomeFriendsPanel";
import { HomeUserHoverCard } from "./HomeUserHoverCard";

const HOME_CONTACT_SUGGESTION_LIMIT = 5;

interface HomeRightSidebarProps {
    user: UserResponse | null;
    hasMyStories: boolean;
    userRolesById: UserRoleMap;
    onOpenProfile: () => void;
}

export function HomeRightSidebar({
    user,
    hasMyStories,
    userRolesById,
    onOpenProfile,
}: HomeRightSidebarProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [suggestions, setSuggestions] = useState<ContactSuggestionResponse[]>(
        [],
    );
    const [pendingSuggestionIds, setPendingSuggestionIds] = useState<Set<string>>(
        new Set(),
    );
    const [requestIdsBySuggestionId, setRequestIdsBySuggestionId] = useState<
        Record<string, string>
    >({});

    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const response = await contactService.getSuggestions(
                    HOME_CONTACT_SUGGESTION_LIMIT,
                );
                if (response.code !== 1000 || !response.result) {
                    setSuggestions([]);
                    return;
                }
                setSuggestions(response.result);
            } catch {
                setSuggestions([]);
            }
        };

        void loadSuggestions();
    }, []);

    const handleAddFriend = async (suggestion: ContactSuggestionResponse) => {
        const userId = suggestion.id;
        setPendingSuggestionIds((current) => new Set(current).add(userId));
        try {
            const response = await contactService.sendRequest({
                contactId: userId,
            });
            if (response.code !== 1000) {
                throw new Error(response.message ?? t("home.friend_request_send_failed"));
            }
            setRequestIdsBySuggestionId((current) => ({
                ...current,
                [userId]: response.result.id,
            }));
            toast.success(t("home.friend_request_sent"));
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("home.friend_request_send_failed");
            toast.error(message);
        } finally {
            setPendingSuggestionIds((current) => {
                const next = new Set(current);
                next.delete(userId);
                return next;
            });
        }
    };

    const handleCancelRequest = async (suggestion: ContactSuggestionResponse) => {
        const contactId = requestIdsBySuggestionId[suggestion.id];
        if (!contactId) {
            return;
        }

        setPendingSuggestionIds((current) => new Set(current).add(suggestion.id));
        try {
            const response = await contactService.delete(contactId);
            if (response.code !== 1000) {
                throw new Error(response.message ?? t("home.friend_request_cancel_failed"));
            }
            setRequestIdsBySuggestionId((current) => {
                const next = { ...current };
                delete next[suggestion.id];
                return next;
            });
            toast.success(t("home.friend_request_canceled"));
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : t("home.friend_request_cancel_failed");
            toast.error(message);
        } finally {
            setPendingSuggestionIds((current) => {
                const next = new Set(current);
                next.delete(suggestion.id);
                return next;
            });
        }
    };

    return (
        <aside className="sticky top-0 hidden h-screen w-100 shrink-0 overflow-x-hidden overflow-y-auto pt-8 pr-8 pl-6 xl:block hide-scrollbar">
            <div className="mb-8 flex items-center justify-between rounded-2xl border border-border bg-card p-4 iv-shadow-sm">
                <div
                    className="flex cursor-pointer items-center gap-3"
                    onClick={onOpenProfile}
                >
                    <div
                        className={cn(
                            "rounded-full p-0.5",
                            hasMyStories
                                ? "story-ring-active"
                                : "bg-transparent",
                        )}
                    >
                        <div className="rounded-full bg-background p-0.5">
                            <Avatar className="h-12 w-12">
                                <AvatarImage
                                    src={user?.avatarUrl}
                                    alt={user?.displayName || t("home.your_profile")}
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-linear-to-tr from-pink-400 to-indigo-500 text-sm font-semibold text-white">
                                    {user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h4 className="truncate font-semibold text-foreground">
                                {user?.displayName || t("home.current_user")}
                            </h4>
                            {user?.role === "ADMIN" && <AdminBadge />}
                        </div>
                        <p className="text-[13px] text-muted-foreground">
                            {user?.email || "user@example.com"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <h3 className="font-semibold text-muted-foreground">
                    {t("home.people_you_may_know")}
                </h3>
            </div>

            {suggestions.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-border bg-card/70 p-3 iv-shadow-sm">
                        {suggestions.map((suggestion) => {
                            const hasRequested = Boolean(
                                requestIdsBySuggestionId[suggestion.id],
                            );
                            const isPending = pendingSuggestionIds.has(suggestion.id);
                            const suggestionRole =
                                suggestion.role ?? userRolesById[suggestion.id];

                            return (
                                <div
                                    key={suggestion.id}
                                    className="group relative flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/70"
                                >
                                    <Avatar className="size-10 shrink-0">
                                        <AvatarImage
                                            src={suggestion.avatarUrl}
                                            alt={suggestion.displayName}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-muted text-sm font-semibold text-muted-foreground">
                                            {suggestion.displayName
                                                .charAt(0)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {suggestion.displayName}
                                            </p>
                                            {suggestionRole === "ADMIN" && (
                                                <AdminBadge className="size-3.5" />
                                            )}
                                        </div>
                                        <p className="truncate text-xs text-muted-foreground">
                                            @{suggestion.username} -{" "}
                                            {t("home.mutual_friends", { count: suggestion.mutualFriendCount })}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={hasRequested ? "ghost" : "outline"}
                                        disabled={isPending}
                                        onClick={() =>
                                            hasRequested
                                                ? void handleCancelRequest(suggestion)
                                                : void handleAddFriend(suggestion)
                                        }
                                        className={cn(
                                            "h-8 rounded-xl px-3 text-xs",
                                            hasRequested &&
                                                "text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10",
                                        )}
                                    >
                                        {hasRequested ? t("home.cancel") : t("home.add")}
                                    </Button>

                                    <HomeUserHoverCard
                                        user={{
                                            id: suggestion.id,
                                            displayName: suggestion.displayName,
                                            username: suggestion.username,
                                            avatarUrl: suggestion.avatarUrl,
                                            subtitle: t("home.mutual_friends", { count: suggestion.mutualFriendCount }),
                                            role: suggestionRole,
                                        }}
                                        mode="suggestion"
                                        isPending={isPending}
                                        hasRequested={hasRequested}
                                        onViewProfile={() =>
                                            navigate(`/u/${suggestion.username}`)
                                        }
                                        onAddFriend={() => void handleAddFriend(suggestion)}
                                    />
                                </div>
                            );
                        })}
                </div>
            ) : (
                <div className="rounded-2xl border border-border bg-card/70 px-4 py-6 text-center text-sm text-muted-foreground iv-shadow-sm">
                    {t("home.suggestions_empty")}
                </div>
            )}

            <HomeFriendsPanel
                user={user}
                userRolesById={userRolesById}
            />

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
                {t("home.copyright")}
            </p>
        </aside>
    );
}
