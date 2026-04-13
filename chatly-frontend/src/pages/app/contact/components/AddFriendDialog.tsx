import { useState, useEffect } from "react";
import { Ban, Loader2, Check, Clock } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userService } from "@/services/user.service";
import { contactService } from "@/services/contact.service";
import type { UserResponse } from "@/types/auth";
import type { ContactResponse } from "@/types/contact";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { useContactStore } from "@/store/contact.store";
import { useNavigate } from "react-router-dom";

interface AddFriendDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddFriendDialog({ open, onOpenChange }: AddFriendDialogProps) {
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const getBlockDirection = useContactStore((s) => s.getBlockDirection);
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState<ContactResponse[]>([]);
    const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) {
            contactService.getAll().then((res) => {
                if (res.result) setContacts(res.result);
            }).catch(() => {});
        } else {
            setSearchQuery("");
            setUsers([]);
        }
    }, [open]);

    const getContactStatus = (userId: string) => {
        if (!currentUser) return null;
        return contacts.find(
            (c) =>
                (c.user.id === currentUser.id && c.contact.id === userId) ||
                (c.contact.id === currentUser.id && c.user.id === userId),
        ) ?? null;
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const res = await userService.getAll();
            if (res.result) {
                const filtered = res.result.filter((u) => {
                    if (u.id === currentUser?.id) return false;
                    const query = searchQuery.toLowerCase();
                    return (
                        u.displayName?.toLowerCase().includes(query) ||
                        u.email?.toLowerCase().includes(query) ||
                        u.phone?.includes(query)
                    );
                });
                setUsers(filtered);
            }
        } catch (err) {
            console.error(err);
            toast.error("Error searching for user");
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (userId: string) => {
        setSendingIds((prev) => new Set(prev).add(userId));
        try {
            await contactService.sendRequest({ contactId: userId });
            toast.success("Friend request sent");
            // Refresh contacts so button updates immediately
            const res = await contactService.getAll();
            if (res.result) setContacts(res.result);
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(msg || "Could not send friend request");
        } finally {
            setSendingIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add friend</DialogTitle>
                    <DialogDescription>
                        Search by phone number, email or name.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    <Input
                        placeholder="Enter phone number, email or name"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                        }}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Search"}
                    </Button>
                </div>
                <div className="mt-4 flex flex-col gap-3 min-h-[150px] max-h-[300px] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center p-4">
                            <span className="text-muted-foreground text-sm">Searching...</span>
                        </div>
                    ) : users.length > 0 ? (
                        users.map((u) => {
                            const blockDir = currentUser?.id
                                ? getBlockDirection(currentUser.id, u.id)
                                : null;
                            const contactRecord = getContactStatus(u.id);
                            const status = contactRecord?.status;
                            const isSending = sendingIds.has(u.id);

                            return (
                                <div key={u.id} className="flex justify-between items-center bg-muted/40 p-2 rounded-lg">
                                    <button
                                        type="button"
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                                        onClick={() => {
                                            onOpenChange(false);
                                            navigate(`/profile/${u.id}`);
                                        }}
                                    >
                                        <Avatar>
                                            <AvatarImage src={u.avatarUrl} className="object-cover" />
                                            <AvatarFallback>
                                                {u.displayName?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium truncate">{u.displayName}</p>
                                                {blockDir === "I_BLOCKED" && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="gap-1 text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20 shrink-0"
                                                    >
                                                        <Ban className="h-2.5 w-2.5" /> Blocked
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{u.email || u.phone || `@${u.username}`}</p>
                                        </div>
                                    </button>
                                    {status === "ACCEPTED" ? (
                                        <Button size="sm" variant="ghost" disabled className="gap-1 text-muted-foreground">
                                            <Check className="h-3 w-3" /> Friends
                                        </Button>
                                    ) : status === "PENDING" ? (
                                        <Button size="sm" variant="ghost" disabled className="gap-1 text-muted-foreground">
                                            <Clock className="h-3 w-3" /> Pending
                                        </Button>
                                    ) : !blockDir ? (
                                        <Button
                                            size="sm"
                                            disabled={isSending}
                                            onClick={() => handleAddFriend(u.id)}
                                        >
                                            {isSending ? <Loader2 className="animate-spin h-3 w-3" /> : "Add friend"}
                                        </Button>
                                    ) : null}
                                </div>
                            );
                        })
                    ) : searchQuery && !loading ? (
                        <div className="flex items-center justify-center p-4">
                            <span className="text-muted-foreground text-sm">No users found</span>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
