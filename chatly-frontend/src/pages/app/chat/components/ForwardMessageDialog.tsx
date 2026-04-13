import { useEffect, useMemo, useState } from "react";
import { Search, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import type { UserResponse } from "@/types/auth";
import type { ConversationResponse } from "@/types/conversation";
import { getConversationAvatar, getConversationDisplayName } from "@/utils/conversation";

interface ForwardMessageDialogProps {
    open: boolean;
    currentConversationId: string;
    currentUserId: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: (conversationIds: string[]) => Promise<void>;
}

export function ForwardMessageDialog({
    open,
    currentConversationId,
    currentUserId,
    onOpenChange,
    onConfirm,
}: ForwardMessageDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [conversations, setConversations] = useState<ConversationResponse[]>([]);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setSelectedIds([]);
            return;
        }

        let disposed = false;
        const fetchData = async () => {
            try {
                setLoading(true);
                const [conversationsResponse, usersResponse] = await Promise.all([
                    conversationService.getMyConversations(),
                    userService.getAll(),
                ]);

                if (disposed) return;

                setConversations(
                    (conversationsResponse.result ?? []).filter(
                        (conversation) => conversation.id !== currentConversationId,
                    ),
                );
                setUsers(usersResponse.result ?? []);
            } finally {
                if (!disposed) setLoading(false);
            }
        };

        fetchData();
        return () => {
            disposed = true;
        };
    }, [open, currentConversationId]);

    const filteredConversations = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        if (!normalizedQuery) return conversations;

        return conversations.filter((conversation) => {
            const displayName = getConversationDisplayName(conversation, currentUserId, users).toLowerCase();
            return displayName.includes(normalizedQuery);
        });
    }, [conversations, currentUserId, searchQuery, users]);

    const toggleConversation = (conversationId: string, checked: boolean) => {
        setSelectedIds((prev) => {
            if (checked) {
                return prev.includes(conversationId) ? prev : [...prev, conversationId];
            }
            return prev.filter((id) => id !== conversationId);
        });
    };

    const handleConfirm = async () => {
        if (selectedIds.length === 0) return;

        try {
            setSubmitting(true);
            await onConfirm(selectedIds);
            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Forward Message</DialogTitle>
                    <DialogDescription>
                        Select one or more conversations to forward this message.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search conversations..."
                        className="pl-9"
                    />
                </div>

                <ScrollArea className="max-h-80 rounded-xl border border-border/60">
                    <div className="p-2">
                        {loading ? (
                            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                Loading conversations...
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                No matching conversations found.
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => {
                                const displayName = getConversationDisplayName(conversation, currentUserId, users);
                                const avatarUrl = getConversationAvatar(conversation, currentUserId, users);
                                const selected = selectedIds.includes(conversation.id);

                                return (
                                    <label
                                        key={conversation.id}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                                            selected ? "bg-brand/10" : "hover:bg-muted/60",
                                        )}
                                    >
                                        <Checkbox
                                            checked={selected}
                                            onCheckedChange={(checked) => toggleConversation(conversation.id, checked === true)}
                                        />
                                        <Avatar className="h-10 w-10 border border-border/50">
                                            <AvatarImage src={avatarUrl} />
                                            <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {conversation.type === "GROUP" ? "Group chat" : "Private chat"}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={selectedIds.length === 0 || submitting || loading}>
                        {submitting ? "Forwarding..." : "Forward"}
                        {!submitting && <Send className="ml-2 size-4" />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}