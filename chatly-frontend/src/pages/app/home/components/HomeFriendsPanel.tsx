import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePresenceSocket, type PresenceEvent } from "@/hooks/usePresenceSocket";
import { conversationService } from "@/services/conversation.service";
import { useContactStore } from "@/store/contact.store";
import type { UserResponse } from "@/types/auth";
import type { ContactResponse } from "@/types/contact";
import { HomeUserHoverCard } from "./HomeUserHoverCard";

type PresenceStatus = "ONLINE" | "OFFLINE";

interface FriendListItem {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    status?: string;
}

interface HomeFriendsPanelProps {
    user: UserResponse | null;
}

function getFriend(
    contact: ContactResponse,
    currentUserId: string,
): FriendListItem {
    return contact.user.id === currentUserId ? contact.contact : contact.user;
}

export function HomeFriendsPanel({ user }: HomeFriendsPanelProps) {
    const navigate = useNavigate();
    const contacts = useContactStore((state) => state.contacts);
    const loaded = useContactStore((state) => state.loaded);
    const fetchContacts = useContactStore((state) => state.fetchContacts);
    const [openingFriendId, setOpeningFriendId] = useState<string | null>(null);
    const [presenceByUserId, setPresenceByUserId] = useState<
        Record<string, PresenceStatus>
    >({});

    useEffect(() => {
        if (!loaded) {
            void fetchContacts();
        }
    }, [fetchContacts, loaded]);

    const handlePresenceChange = useCallback((event: PresenceEvent) => {
        setPresenceByUserId((current) => ({
            ...current,
            [event.userId]: event.status,
        }));
    }, []);

    usePresenceSocket({ onPresenceChange: handlePresenceChange });

    const handleOpenConversation = useCallback(
        async (friendId: string) => {
            if (!user || openingFriendId) {
                return;
            }

            setOpeningFriendId(friendId);
            try {
                const conversationsResponse =
                    await conversationService.getMyConversations();
                const existingConversation = conversationsResponse.result?.find(
                    (conversation) =>
                        conversation.type === "PRIVATE" &&
                        conversation.participantIds.includes(friendId) &&
                        conversation.participantIds.includes(user.id),
                );

                if (existingConversation) {
                    navigate(`/chat/${existingConversation.id}`);
                    return;
                }

                const response = await conversationService.create({
                    type: "PRIVATE",
                    participantIds: [friendId],
                });

                if (response.result) {
                    navigate(`/chat/${response.result.id}`);
                }
            } catch {
                toast.error("Could not open conversation.");
            } finally {
                setOpeningFriendId(null);
            }
        },
        [navigate, openingFriendId, user],
    );

    const friends = useMemo(() => {
        if (!user) {
            return [];
        }

        return contacts
            .filter((contact) => contact.status === "ACCEPTED")
            .map((contact) => getFriend(contact, user.id))
            .sort((first, second) => {
                const firstStatus = presenceByUserId[first.id] ?? first.status;
                const secondStatus = presenceByUserId[second.id] ?? second.status;
                if (firstStatus === secondStatus) {
                    return first.displayName.localeCompare(second.displayName);
                }
                return firstStatus === "ONLINE" ? -1 : 1;
            });
    }, [contacts, presenceByUserId, user]);

    if (friends.length === 0) {
        return null;
    }

    return (
        <section className="mt-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-muted-foreground">Friends</h3>
                <span className="text-xs text-muted-foreground">
                    {friends.length}
                </span>
            </div>

            <div className="space-y-1 rounded-2xl border border-border bg-card/70 p-3">
                {friends.map((friend) => {
                    const status = presenceByUserId[friend.id] ?? friend.status;
                    const isOnline = status === "ONLINE";

                    return (
                        <div key={friend.id} className="group relative">
                            <button
                                type="button"
                                disabled={openingFriendId !== null}
                                onClick={() => void handleOpenConversation(friend.id)}
                                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/70 disabled:cursor-wait disabled:opacity-70"
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="size-10">
                                        <AvatarImage
                                            src={friend.avatarUrl}
                                            alt={friend.displayName}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-muted text-sm font-semibold text-muted-foreground">
                                            {friend.displayName.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isOnline && (
                                        <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-card bg-emerald-500" />
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {friend.displayName}
                                    </p>
                                    {isOnline && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                            Online
                                        </p>
                                    )}
                                </div>
                            </button>

                            <HomeUserHoverCard
                                user={{
                                    id: friend.id,
                                    displayName: friend.displayName,
                                    username: friend.username,
                                    avatarUrl: friend.avatarUrl,
                                    subtitle: isOnline ? "Online" : `@${friend.username}`,
                                }}
                                mode="friend"
                                onViewProfile={() => navigate(`/u/${friend.username}`)}
                                onMessage={() => void handleOpenConversation(friend.id)}
                            />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
