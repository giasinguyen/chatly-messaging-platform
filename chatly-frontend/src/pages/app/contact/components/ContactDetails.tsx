import { useState, useEffect, useCallback } from "react";
import { UsersRound } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ContactTab } from "../index";
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import type { ContactResponse } from "@/types/contact";
import { useAuthStore } from "@/store/auth.store";
import { useContactStore } from "@/store/contact.store";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ContactFilters } from "./ContactFilters";
import { ContactItem } from "./ContactItem";
import { ContactConfirmDialog, type ConfirmAction } from "./ContactConfirmDialog";
import { usePresenceSocket } from "@/hooks/usePresenceSocket";

interface ContactDetailsProps {
    activeTab: ContactTab;
}

export function ContactDetails({ activeTab }: ContactDetailsProps) {
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const invalidateContacts = useContactStore((s) => s.invalidate);
    const pendingRefreshToken = useContactStore((s) => s.pendingRefreshToken);
    const [contacts, setContacts] = useState<ContactResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
    const [sortDir, setSortDir] = useState<"name-asc" | "name-desc">("name-asc");
    const [onlineFilter, setOnlineFilter] = useState<"all" | "online">("all");
    const [onlineUserIds, setOnlineUserIds] = useState<Record<string, "ONLINE" | "OFFLINE">>({});

    usePresenceSocket({
        onPresenceChange: useCallback((event) => {
            setOnlineUserIds((prev) => ({ ...prev, [event.userId]: event.status }));
        }, []),
    });

    const fetchContacts = async () => {
        setLoading(true);
        try {
            let statusQuery = "ACCEPTED";
            if (activeTab === "requests") statusQuery = "PENDING";
            if (activeTab === "blocked") statusQuery = "BLOCKED";

            const res = await contactService.getByStatus(statusQuery as any);
            if (res.result) setContacts(res.result);
        } catch (error) {
            console.error(error);
            toast.error("Could not load contact list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
        setSearchQuery("");
        setSortDir("name-asc");
        setOnlineFilter("all");
    }, [activeTab]);

    // Refresh pending requests when a new friend request notification arrives
    useEffect(() => {
        if (pendingRefreshToken > 0 && activeTab === "requests") {
            fetchContacts();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingRefreshToken]);

    const handleAccept = async (id: string) => {
        try {
            await contactService.accept(id);
            toast.success("Friend request accepted");
            invalidateContacts();
            fetchContacts();
        } catch {
            toast.error("Error accepting friend request");
        }
    };

    const handleReject = async (id: string) => {
        try {
            await contactService.delete(id);
            toast.success("Friend request rejected");
            fetchContacts();
        } catch {
            toast.error("Error rejecting friend request");
        }
    };

    const handleConfirm = async () => {
        if (!confirmAction) return;
        try {
            if (confirmAction.type === "unblock") {
                await contactService.unblock(confirmAction.contactId);
                toast.success(`Unblocked ${confirmAction.name}`);
            } else if (confirmAction.type === "block") {
                await contactService.block(confirmAction.contactId);
                toast.success(`Blocked ${confirmAction.name}`);
            } else if (confirmAction.type === "remove") {
                await contactService.delete(confirmAction.contactId);
                toast.success(`Removed ${confirmAction.name} from friends`);
            }
            invalidateContacts();
            fetchContacts();
        } catch {
            toast.error("Action failed. Please try again.");
        } finally {
            setConfirmAction(null);
        }
    };

    const handleMessage = async (friendId: string) => {
        try {
            const convsRes = await conversationService.getMyConversations();
            const existing = convsRes.result?.find(
                (c) =>
                    c.type === "PRIVATE" &&
                    c.participantIds.includes(friendId) &&
                    c.participantIds.includes(currentUser!.id),
            );
            if (existing) {
                navigate(`/chat/${existing.id}`);
                return;
            }
            const res = await conversationService.create({
                type: "PRIVATE",
                participantIds: [friendId],
            });
            if (res.result) navigate(`/chat/${res.result.id}`);
        } catch {
            toast.error("Could not create conversation");
        }
    };

    const getTitle = () => {
        if (activeTab === "requests") return "Friend requests";
        if (activeTab === "blocked") return "Blocked list";
        return "Friends list";
    };

    const filteredContacts = contacts.filter((c) => {
        const otherUser = c.user.id === currentUser?.id ? c.contact : c.user;
        if (searchQuery.trim() && !(otherUser.displayName || "").toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (activeTab === "friends" && onlineFilter === "online" && onlineUserIds[otherUser.id] !== "ONLINE") {
            return false;
        }
        return true;
    });

    const grouped = filteredContacts.reduce((acc, current) => {
        const otherUser = current.user.id === currentUser?.id ? current.contact : current.user;
        const letter = otherUser.displayName?.charAt(0).toUpperCase() || "#";
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(current);
        return acc;
    }, {} as Record<string, ContactResponse[]>);

    const sortedEntries = Object.entries(grouped)
        .sort(([a], [b]) => sortDir === "name-asc" ? a.localeCompare(b) : b.localeCompare(a))
        .map(([letter, items]) => ([
            letter,
            [...items].sort((a, b) => {
                const aName = (a.user.id === currentUser?.id ? a.contact : a.user).displayName ?? "";
                const bName = (b.user.id === currentUser?.id ? b.contact : b.user).displayName ?? "";
                return sortDir === "name-asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
            }),
        ] as [string, ContactResponse[]]));

    return (
        <main className="flex-1 bg-background flex flex-col overflow-hidden">
            <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold text-foreground">{getTitle()}</h2>
                </div>
            </header>

            <ContactFilters
                activeTab={activeTab}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                totalCount={filteredContacts.length}
                sortDir={sortDir}
                onSortDirChange={setSortDir}
                onlineFilter={onlineFilter}
                onOnlineFilterChange={setOnlineFilter}
            />

            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    {loading ? (
                        <div className="flex items-center justify-center p-8 text-muted-foreground">
                            Loading...
                        </div>
                    ) : (
                        <div className="py-2">
                            {sortedEntries
                                .map(([letter, items]) => (
                                    <div key={letter} className="mb-4">
                                        {activeTab === "friends" && (
                                            <div className="px-6 py-2 text-sm font-bold text-foreground border-b border-border/30">
                                                {letter}
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            {items.map((contact) => {
                                                const otherUser = contact.user.id === currentUser?.id ? contact.contact : contact.user;
                                                return (
                                                <ContactItem
                                                    key={contact.id}
                                                    contact={contact}
                                                    currentUserId={currentUser!.id}
                                                    activeTab={activeTab}
                                                    isOnline={onlineUserIds[otherUser.id] === "ONLINE"}
                                                    onAccept={handleAccept}
                                                    onReject={handleReject}
                                                    onMessage={handleMessage}
                                                    onUnblock={(contactId, name) =>
                                                        setConfirmAction({ type: "unblock", contactId, name })
                                                    }
                                                    onBlock={(contactId, name) =>
                                                        setConfirmAction({ type: "block", contactId, name })
                                                    }
                                                    onRemove={(contactId, name) =>
                                                        setConfirmAction({ type: "remove", contactId, name })
                                                    }
                                                />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            {filteredContacts.length === 0 && (
                                <div className="text-center p-8 text-muted-foreground">
                                    No results found
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </div>

            <ContactConfirmDialog
                confirmAction={confirmAction}
                onConfirm={handleConfirm}
                onClose={() => setConfirmAction(null)}
            />
        </main>
    );
}

