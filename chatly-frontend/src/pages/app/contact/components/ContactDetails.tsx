import { useState, useEffect } from "react";
import { UsersRound } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ContactTab } from "../index";
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import type { ContactResponse } from "@/types/contact";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ContactFilters } from "./ContactFilters";
import { ContactItem } from "./ContactItem";
import { ContactConfirmDialog, type ConfirmAction } from "./ContactConfirmDialog";

interface ContactDetailsProps {
    activeTab: ContactTab;
}

export function ContactDetails({ activeTab }: ContactDetailsProps) {
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<ContactResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

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
    }, [activeTab]);

    const handleAccept = async (id: string) => {
        try {
            await contactService.accept(id);
            toast.success("Friend request accepted");
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
        if (!searchQuery.trim()) return true;
        const otherUser = c.user.id === currentUser?.id ? c.contact : c.user;
        return (otherUser.displayName || "").toLowerCase().includes(searchQuery.toLowerCase());
    });

    const grouped = filteredContacts.reduce((acc, current) => {
        const otherUser = current.user.id === currentUser?.id ? current.contact : current.user;
        const letter = otherUser.displayName?.charAt(0).toUpperCase() || "#";
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(current);
        return acc;
    }, {} as Record<string, ContactResponse[]>);

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
            />

            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    {loading ? (
                        <div className="flex items-center justify-center p-8 text-muted-foreground">
                            Loading...
                        </div>
                    ) : (
                        <div className="py-2">
                            {Object.entries(grouped)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([letter, items]) => (
                                    <div key={letter} className="mb-4">
                                        {activeTab === "friends" && (
                                            <div className="px-6 py-2 text-sm font-bold text-foreground border-b border-border/30">
                                                {letter}
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            {items.map((contact) => (
                                                <ContactItem
                                                    key={contact.id}
                                                    contact={contact}
                                                    currentUserId={currentUser!.id}
                                                    activeTab={activeTab}
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
                                            ))}
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

