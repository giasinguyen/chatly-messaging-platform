import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePresenceSocket, type PresenceEvent } from "@/hooks/usePresenceSocket";
import { useContactStore } from "@/store/contact.store";
import type { UserResponse } from "@/types/auth";
import type { ContactResponse } from "@/types/contact";

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
    const contacts = useContactStore((state) => state.contacts);
    const loaded = useContactStore((state) => state.loaded);
    const fetchContacts = useContactStore((state) => state.fetchContacts);
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
                        <div
                            key={friend.id}
                            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/70"
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
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
