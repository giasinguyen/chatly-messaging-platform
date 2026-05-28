import { useState, useEffect, useCallback } from "react";
import { messageService } from "@/services/message.service";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Pin, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toMessagePreviewText } from "./richTextMessage.utils";
import type { Message } from "@/types/message";

interface PinnedMessagesDialogProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUnpin?: (messageId: string) => void;
    onScrollToMessage?: (messageId: string) => void;
}

export function PinnedMessagesDialog({
    conversationId,
    open,
    onOpenChange,
    onUnpin,
    onScrollToMessage,
}: PinnedMessagesDialogProps) {
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPinned = useCallback(async () => {
        if (!conversationId) return;
        setLoading(true);
        try {
            const res = await messageService.getPinnedMessages(conversationId);
            setPinnedMessages(res.result ?? []);
        } catch {
            toast.error("Could not load pinned messages");
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        if (open) fetchPinned();
    }, [open, fetchPinned]);

    const handleUnpin = async (msgId: string) => {
        try {
            await messageService.togglePin(msgId);
            toast.success("Message unpinned");
            onUnpin?.(msgId);
            fetchPinned();
        } catch {
            toast.error("Could not unpin message");
        }
    };

    const getPreview = (msg: Message): string => {
        if (msg.poll) return "📊 " + msg.poll.question;

        const previewText = toMessagePreviewText(msg.content ?? "");
        if (previewText) {
            return previewText.length > 120
                ? previewText.slice(0, 120) + "..."
                : previewText;
        }

        if (msg.attachments?.length) {
            const att = msg.attachments[0];
            if (att.name) {
                return att.name;
            }
            if (att.type?.startsWith("image/")) {
                return "Image";
            }
            return "Attachment";
        }
        return "Message";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[80vh] flex flex-col">
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Pin size={16} className="text-amber-500" />
                        Pinned messages
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0 px-5 pb-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : pinnedMessages.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                            <Pin size={24} className="opacity-30" />
                            <p className="text-xs">No pinned messages yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {pinnedMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="group flex items-start gap-2.5 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/30 cursor-pointer"
                                    onClick={() => {
                                        onScrollToMessage?.(msg.id);
                                        onOpenChange(false);
                                    }}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {msg.attachments?.some((a) => a.type?.startsWith("image/")) ? (
                                            <ImageIcon size={16} className="text-[#1a146b] dark:text-[#818cf8]" />
                                        ) : msg.attachments?.length ? (
                                            <FileText size={16} className="text-[#1a146b] dark:text-[#818cf8]" />
                                        ) : (
                                            <Pin size={14} className="text-amber-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm line-clamp-2">
                                            {getPreview(msg)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {msg.createdAt && new Date(msg.createdAt).toLocaleString("en-US")}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className={cn(
                                            "h-6 px-2 text-[10px] shrink-0 opacity-0 group-hover:opacity-100",
                                            "text-muted-foreground hover:text-destructive",
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnpin(msg.id);
                                        }}
                                    >
                                        Unpin
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
