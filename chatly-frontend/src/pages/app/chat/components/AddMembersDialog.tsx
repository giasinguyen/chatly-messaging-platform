import { useState, useEffect } from "react";
import { Check, Search, Loader2, Users } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminBadge } from "@/components/customize/AdminBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { groupService } from "@/services/group.service";
import { contactService } from "@/services/contact.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AddMembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversationId: string;
    existingMemberIds?: string[];
    onAdded?: () => void;
}

interface FriendOption {
    id: string;
    displayName: string;
    avatarUrl?: string;
    username: string;
    role?: string;
}

export function AddMembersDialog({
    open,
    onOpenChange,
    conversationId,
    existingMemberIds = [],
    onAdded,
}: AddMembersDialogProps) {
    const { user: currentUser } = useAuthStore();
    const [friends, setFriends] = useState<FriendOption[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSelected(new Set());
        setSearchQuery("");
        setLoading(true);
        const existingSet = new Set(existingMemberIds);
        contactService
            .getByStatus("ACCEPTED")
            .then((res) => {
                const opts: FriendOption[] = (res.result ?? [])
                    .map((c) => {
                        const other =
                            c.user.id === currentUser?.id ? c.contact : c.user;
                        return {
                            id: other.id,
                            displayName: other.displayName,
                            avatarUrl: other.avatarUrl,
                            username: other.username,
                            role: other.role,
                        };
                    })
                    .filter((f) => !existingSet.has(f.id));
                setFriends(opts);
            })
            .catch(() => toast.error("Failed to load friend list"))
            .finally(() => setLoading(false));
    }, [open, currentUser?.id]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filtered = friends.filter((f) =>
        f.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Group alphabetically
    const grouped: Record<string, FriendOption[]> = {};
    for (const f of filtered) {
        const letter = f.displayName.charAt(0).toUpperCase();
        if (!grouped[letter]) grouped[letter] = [];
        grouped[letter].push(f);
    }
    const sortedLetters = Object.keys(grouped).sort();

    const handleConfirm = async () => {
        if (selected.size === 0) {
            onOpenChange(false);
            return;
        }
        setSubmitting(true);
        let successCount = 0;
        for (const userId of Array.from(selected)) {
            try {
                await groupService.addMember(conversationId, { userId });
                successCount++;
            } catch {
                const f = friends.find((x) => x.id === userId);
                toast.error(`Failed to add ${f?.displayName ?? userId}`);
            }
        }
        if (successCount > 0) {
            toast.success(`Added ${successCount} members to the group`);
            onAdded?.();
        }
        setSubmitting(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle>Add Members</DialogTitle>
                </DialogHeader>

                <div className="px-5 pb-3 shrink-0">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter name, phone number..."
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 min-h-0 px-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2
                                size={20}
                                className="animate-spin text-muted-foreground"
                            />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                            <Users size={24} className="opacity-30" />
                            <p className="text-sm">
                                {friends.length === 0
                                    ? "No friends to add"
                                    : "Not found"}
                            </p>
                        </div>
                    ) : (
                        <div className="pb-4">
                            {sortedLetters.map((letter) => (
                                <div key={letter}>
                                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                        {letter}
                                    </div>
                                    {grouped[letter].map((f) => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => toggle(f.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                                        >
                                            <div
                                                className={cn(
                                                    "h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                                                    selected.has(f.id)
                                                        ? "bg-brand border-brand"
                                                        : "border-muted-foreground/40 bg-background",
                                                )}
                                            >
                                                {selected.has(f.id) && (
                                                    <Check
                                                        size={11}
                                                        className="text-white"
                                                    />
                                                )}
                                            </div>
                                            <Avatar className="h-9 w-9 shrink-0">
                                                <AvatarImage src={f.avatarUrl} />
                                                <AvatarFallback className="text-sm">
                                                    {f.displayName
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                                                <span className="truncate">
                                                    {f.displayName}
                                                </span>
                                                {f.role === "ADMIN" && (
                                                    <AdminBadge className="size-3.5" />
                                                )}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="px-5 py-3 border-t border-border gap-2 sm:gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={submitting}>
                        {submitting && (
                            <Loader2 size={13} className="animate-spin mr-1" />
                        )}
                        {submitting
                            ? "Adding..."
                            : `Confirm${selected.size > 0 ? ` (${selected.size})` : ""}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
