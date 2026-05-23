import { useEffect, useMemo, useState } from "react";
import { Search, Share2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import type { UserResponse } from "@/types/auth";
import type { ConversationResponse } from "@/types/conversation";
import { getConversationAvatar, getConversationDisplayName } from "@/utils/conversation";

interface ForwardToChatDialogProps {
    open: boolean;
    currentUserId: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: (conversationId: string) => Promise<void>;
}

export function ForwardToChatDialog({
    open,
    currentUserId,
    onOpenChange,
    onConfirm,
}: ForwardToChatDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string>("");
    const [conversations, setConversations] = useState<ConversationResponse[]>([]);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setSelectedId("");
            return;
        }

        let disposed = false;
        const fetchData = async () => {
            try {
                setLoading(true);
                const [convsRes, usersRes] = await Promise.all([
                    conversationService.getMyConversations(),
                    userService.getAll(),
                ]);
                if (!disposed) {
                    setConversations(convsRes.result ?? []);
                    setUsers(usersRes.result ?? []);
                }
            } finally {
                if (!disposed) setLoading(false);
            }
        };
        fetchData();
        return () => {
            disposed = true;
        };
    }, [open]);

    const filteredConversations = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter((c) =>
            getConversationDisplayName(c, currentUserId, users).toLowerCase().includes(q),
        );
    }, [conversations, currentUserId, searchQuery, users]);

    const handleConfirm = async () => {
        if (!selectedId) return;
        try {
            setSubmitting(true);
            await onConfirm(selectedId);
            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Forward to Chat</DialogTitle>
                    <DialogDescription>
                        Select a conversation. The message will be filled into the composer for you to review before sending.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="pl-9"
                    />
                </div>

                <ScrollArea className="max-h-80 rounded-xl border border-border/60">
                    <RadioGroup value={selectedId} onValueChange={setSelectedId}>
                        <div className="p-2 space-y-0.5">
                            {loading ? (
                                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                    Loading conversations...
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                    No matching conversations found.
                                </div>
                            ) : (
                                filteredConversations.map((conv) => {
                                    const displayName = getConversationDisplayName(conv, currentUserId, users);
                                    const avatarUrl = getConversationAvatar(conv, currentUserId, users);
                                    const isGroup = conv.type === "GROUP";

                                    return (
                                        <label
                                            key={conv.id}
                                            className={cn(
                                                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                                                selectedId === conv.id ? "bg-brand/10" : "hover:bg-muted/60",
                                            )}
                                        >
                                            <RadioGroupItem value={conv.id} id={conv.id} />
                                            <Avatar className="h-10 w-10 border border-border/50">
                                                <AvatarImage src={avatarUrl} />
                                                <AvatarFallback>
                                                    {isGroup
                                                        ? <Users className="size-4 text-muted-foreground" />
                                                        : displayName.charAt(0)
                                                    }
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {displayName}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {isGroup ? "Group chat" : "Private chat"}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </RadioGroup>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedId || submitting || loading}
                        className="gap-2"
                    >
                        {submitting ? (
                            "Opening..."
                        ) : (
                            <>
                                <Share2 className="size-4" />
                                Forward
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
