import { useState, useEffect } from "react";
import { Check, Search, Users } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { contactService } from "@/services/contact.service";
import { conversationService } from "@/services/conversation.service";
import { useAuthStore } from "@/store/auth.store";
import type { ConversationResponse } from "@/types/conversation";
import { toast } from "sonner";

interface CreateGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (conv: ConversationResponse) => void;
}

interface FriendOption {
    id: string;
    displayName: string;
    avatarUrl?: string;
    username: string;
}

export function CreateGroupDialog({
    open,
    onOpenChange,
    onCreated,
}: CreateGroupDialogProps) {
    const { user: currentUser } = useAuthStore();
    const [groupName, setGroupName] = useState("");
    const [friends, setFriends] = useState<FriendOption[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setGroupName("");
        setSelected(new Set());
        setSearchQuery("");

        const loadFriends = async () => {
            setLoadingFriends(true);
            try {
                const res = await contactService.getByStatus("ACCEPTED");
                const opts: FriendOption[] = (res.result ?? []).map((c) => {
                    const other =
                        c.user.id === currentUser?.id ? c.contact : c.user;
                    return {
                        id: other.id,
                        displayName: other.displayName,
                        avatarUrl: other.avatarUrl,
                        username: other.username,
                    };
                });
                setFriends(opts);
            } catch {
                toast.error("Không thể tải danh sách bạn bè");
            } finally {
                setLoadingFriends(false);
            }
        };

        loadFriends();
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

    const handleCreate = async () => {
        if (!groupName.trim()) {
            toast.error("Vui lòng nhập tên nhóm");
            return;
        }
        if (selected.size < 2) {
            toast.error("Nhóm cần ít nhất 2 thành viên ngoài bạn");
            return;
        }
        try {
            setSubmitting(true);
            const res = await conversationService.create({
                type: "GROUP",
                name: groupName.trim(),
                participantIds: Array.from(selected),
            });
            if (res.result) {
                toast.success(`Đã tạo nhóm "${groupName.trim()}"`);
                onCreated(res.result);
                onOpenChange(false);
            }
        } catch {
            toast.error("Không thể tạo nhóm. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users size={18} className="text-brand" />
                        Tạo nhóm chat
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    {/* Group name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Tên nhóm
                        </label>
                        <Input
                            placeholder="Nhập tên nhóm..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            maxLength={60}
                            autoFocus
                        />
                    </div>

                    {/* Friend selection */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Thêm thành viên{" "}
                            <span className="text-muted-foreground font-normal">
                                ({selected.size} đã chọn)
                            </span>
                        </label>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm bạn bè..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-8 text-sm"
                            />
                        </div>

                        {/* List */}
                        <ScrollArea className="h-52 rounded-md border border-border/60">
                            {loadingFriends ? (
                                <div className="flex items-center justify-center h-full py-8 text-sm text-muted-foreground">
                                    Đang tải...
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex items-center justify-center h-full py-8 text-sm text-muted-foreground">
                                    Không tìm thấy bạn bè
                                </div>
                            ) : (
                                <div className="p-1">
                                    {filtered.map((f) => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => toggle(f.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors"
                                        >
                                            {/* Custom checkbox */}
                                            <div className={cn(
                                                "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                selected.has(f.id)
                                                    ? "bg-brand border-brand"
                                                    : "border-border bg-background",
                                            )}>
                                                {selected.has(f.id) && (
                                                    <Check size={10} className="text-white" />
                                                )}
                                            </div>
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarImage src={f.avatarUrl} />
                                                <AvatarFallback className="text-xs">
                                                    {f.displayName.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm text-foreground truncate">
                                                {f.displayName}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>

                        <p className="text-[11px] text-muted-foreground">
                            Nhóm cần ít nhất 2 thành viên ngoài bạn.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={submitting || !groupName.trim() || selected.size < 2}
                    >
                        {submitting ? "Đang tạo..." : "Tạo nhóm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
