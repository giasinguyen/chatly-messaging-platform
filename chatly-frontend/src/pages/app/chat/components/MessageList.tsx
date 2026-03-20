import { useEffect, useRef, useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, Reply, RotateCcw, Pencil, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, ChatUser } from "@/types/message";
import type { ConversationType } from "@/types/conversation";
import { ReplyPreview } from "./ReplyPreview";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageListProps {
    messages: Message[];
    participant: ChatUser;
    conversationType: ConversationType;
    participantDirectory: Record<string, ChatUser>;
    currentUserId: string;
    onReply: (msg: Message) => void;
    onRecall: (messageId: string) => void;
    onEdit: (messageId: string, newContent: string) => void;
    onOpenSenderProfile?: (userId: string) => void;
    onLoadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
}

const RECALL_LIMIT_MS = 24 * 60 * 60 * 1000;
const EDIT_LIMIT_MS = 15 * 60 * 1000;

export function MessageList({
    messages,
    participant,
    conversationType,
    participantDirectory,
    currentUserId,
    onReply,
    onRecall,
    onEdit,
    onOpenSenderProfile,
    onLoadMore,
    isLoadingMore,
    hasMore,
}: MessageListProps) {
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const isFirstMount = useRef(true);

    // Edit inline state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");

    // Recall confirm dialog state
    const [recallConfirmId, setRecallConfirmId] = useState<string | null>(null);

    // Auto scroll to bottom only on first mount or new messages from bottom
    useEffect(() => {
        if (isFirstMount.current) {
            scrollEndRef.current?.scrollIntoView({ behavior: "instant" });
            isFirstMount.current = false;
        } else {
            scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length]);

    // Restore scroll position after loading more messages at top
    useEffect(() => {
        if (
            !isLoadingMore &&
            containerRef.current &&
            prevScrollHeightRef.current > 0
        ) {
            const newScrollHeight = containerRef.current.scrollHeight;
            containerRef.current.scrollTop =
                newScrollHeight - prevScrollHeightRef.current;
            prevScrollHeightRef.current = 0;
        }
    }, [isLoadingMore, messages]);

    // IntersectionObserver for lazy load
    const handleSentinelIntersect = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const entry = entries[0];
            if (entry.isIntersecting && hasMore && !isLoadingMore) {
                if (containerRef.current) {
                    prevScrollHeightRef.current =
                        containerRef.current.scrollHeight;
                }
                onLoadMore();
            }
        },
        [hasMore, isLoadingMore, onLoadMore],
    );

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(handleSentinelIntersect, {
            root: containerRef.current,
            threshold: 0.1,
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [handleSentinelIntersect]);

    const getStatusIcon = (status: Message["status"]) => {
        if (status === "READ")
            return <CheckCheck size={12} className="text-brand" />;
        if (status === "DELIVERED")
            return (
                <CheckCheck size={12} className="text-muted-foreground/60" />
            );
        return <Check size={12} className="text-muted-foreground/60" />;
    };

    const TIME_GAP_THRESHOLD = 10 * 60 * 1000; // 10 minutes

    const shouldShowAvatar = (currentMsg: Message, index: number): boolean => {
        if (index === 0) return true;
        const prevMsg = messages[index - 1];
        if (!prevMsg) return true;
        if (prevMsg.senderId !== currentMsg.senderId) return true;
        const timeDiff = new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
        return timeDiff >= TIME_GAP_THRESHOLD;
    };

    const isLastInGroup = (currentMsg: Message, index: number): boolean => {
        const nextMsg = messages[index + 1];
        if (!nextMsg) return true;
        if (nextMsg.senderId !== currentMsg.senderId) return true;
        const timeDiff = new Date(nextMsg.createdAt).getTime() - new Date(currentMsg.createdAt).getTime();
        return timeDiff >= TIME_GAP_THRESHOLD;
    };

    const renderTimeSeparator = (msg: Message, index: number) => {
        if (index === 0) return null;
        const prevMsg = messages[index - 1];
        if (!prevMsg) return null;
        const timeDiff = new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
        if (timeDiff < TIME_GAP_THRESHOLD) return null;

        return (
            <div key={`time-sep-${msg.id}`} className="flex items-center gap-3 px-4 py-2">
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <div className="flex-1 h-px bg-border/30" />
            </div>
        );
    };

    const canRecall = (msg: Message): boolean => {
        if (msg.recalled) return false;
        if (msg.senderId !== currentUserId) return false;
        if (msg.type === "SYSTEM") return false;
        const age = Date.now() - new Date(msg.createdAt).getTime();
        return age < RECALL_LIMIT_MS;
    };

    const canEdit = (msg: Message): boolean => {
        if (msg.recalled) return false;
        if (msg.senderId !== currentUserId) return false;
        if (msg.type !== "TEXT") return false;
        const age = Date.now() - new Date(msg.createdAt).getTime();
        return age < EDIT_LIMIT_MS;
    };

    const startEdit = (msg: Message) => {
        setEditingId(msg.id);
        setEditDraft(msg.content);
    };

    const commitEdit = () => {
        if (editingId && editDraft.trim()) {
            onEdit(editingId, editDraft.trim());
        }
        setEditingId(null);
        setEditDraft("");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft("");
    };

    const renderMessage = (msg: Message, index: number) => {
        const isMe = msg.senderId === currentUserId;
        const sender = participantDirectory[msg.senderId] ?? participant;
        const senderShortName = sender.displayName.split(" ").slice(-1)[0] || "Người dùng";
        const repliedMsg = msg.replyToId
            ? messages.find((m) => m.id === msg.replyToId)
            : null;
        const replySenderName = repliedMsg
            ? repliedMsg.senderId === currentUserId
                ? "Bạn"
                : (participantDirectory[repliedMsg.senderId]?.displayName || participant.displayName).split(" ").slice(-1)[0]
            : undefined;

        const isBeingEdited = editingId === msg.id;

        const bubble = (
            <div
                className={cn(
                    "flex gap-2 group px-4",
                    isLastInGroup(msg, index) ? "mb-3" : "mb-0.5",
                    isMe ? "flex-row-reverse" : "flex-row",
                )}
            >
                {!isMe && shouldShowAvatar(msg, index) && (
                    <button
                        type="button"
                        onClick={() => onOpenSenderProfile?.(msg.senderId)}
                        className="shrink-0"
                        title="Xem thông tin người dùng"
                    >
                        <Avatar className="h-8 w-8 align-bottom border border-border/30 shrink-0">
                            <AvatarImage src={sender.avatarUrl} />
                            <AvatarFallback>{sender.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </button>
                )}
                {!isMe && !shouldShowAvatar(msg, index) && (
                    <div className="h-8 w-8 shrink-0" />
                )}

                <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                    {!isMe && conversationType === "GROUP" && shouldShowAvatar(msg, index) && (
                        <button
                            type="button"
                            onClick={() => onOpenSenderProfile?.(msg.senderId)}
                            className="text-[11px] text-muted-foreground mb-1 px-1 hover:text-foreground transition-colors"
                            title="Xem thông tin người dùng"
                        >
                            {senderShortName}
                        </button>
                    )}

                    {/* Bubble + Reply button */}
                    <div className={cn("flex items-end gap-1", isMe ? "flex-row-reverse" : "flex-row")}>
                        {/* Bubble */}
                        {msg.recalled ? (
                            /* Recalled message placeholder */
                            <div
                                className={cn(
                                    "px-3 py-2 text-sm rounded-2xl border italic text-muted-foreground",
                                    isMe
                                        ? "bg-brand/10 border-brand/20"
                                        : "bg-muted/40 border-border/40 dark:bg-zinc-800/50 dark:border-zinc-700/50",
                                )}
                            >
                                <RotateCcw size={12} className="inline mr-1.5 opacity-60" />
                                Tin nhắn đã được thu hồi
                            </div>
                        ) : isBeingEdited ? (
                            /* Inline edit input */
                            <div className="flex items-center gap-1">
                                <Input
                                    autoFocus
                                    value={editDraft}
                                    onChange={e => setEditDraft(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                                        if (e.key === "Escape") cancelEdit();
                                    }}
                                    className="h-8 text-sm min-w-50 max-w-xs"
                                />
                                <button
                                    onClick={commitEdit}
                                    className="p-1.5 rounded-full bg-brand text-white hover:bg-brand/80 shrink-0"
                                    title="Lưu"
                                >
                                    <Send size={12} />
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground shrink-0"
                                    title="Hủy"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            /* Normal bubble */
                            <div
                                className={cn(
                                    "px-3 py-2 text-sm shadow-sm transition-all",
                                    isMe
                                        ? "bg-brand text-white rounded-2xl"
                                        : "bg-muted/75 border border-border/60 text-foreground dark:bg-zinc-800/90 dark:border-zinc-700 rounded-2xl",
                                )}
                            >
                                {repliedMsg && (
                                    <ReplyPreview
                                        replyMessage={repliedMsg}
                                        participant={participant}
                                        senderName={replySenderName}
                                        currentUserId={currentUserId}
                                        isMe={isMe}
                                    />
                                )}
                                {msg.content}
                                {msg.edited && (
                                    <span className={cn("ml-1.5 text-[10px] opacity-60")}>
                                        (đã chỉnh sửa)
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Reply button (on hover) — hidden for recalled messages */}
                        {!msg.recalled && !isBeingEdited && (
                            <button
                                onClick={() => onReply(msg)}
                                className={cn(
                                    "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0",
                                )}
                                title="Trả lời"
                            >
                                <Reply size={14} />
                            </button>
                        )}
                    </div>

                    {/* Time + status */}
                    {isLastInGroup(msg, index) && (
                        <div
                            className={cn(
                                "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1",
                                isMe ? "flex-row-reverse" : "flex-row",
                            )}
                        >
                            <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isMe && !msg.recalled && <span>{getStatusIcon(msg.status)}</span>}
                        </div>
                    )}
                </div>
            </div>
        );

        /* Wrap mine messages in context menu for recall/edit */
        if (!isMe || msg.recalled || isBeingEdited) return bubble;

        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>{bubble}</ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                    <ContextMenuItem
                        onClick={() => onReply(msg)}
                        className="gap-2"
                    >
                        <Reply size={14} />
                        Trả lời
                    </ContextMenuItem>
                    {canEdit(msg) && (
                        <ContextMenuItem
                            onClick={() => startEdit(msg)}
                            className="gap-2"
                        >
                            <Pencil size={14} />
                            Chỉnh sửa
                        </ContextMenuItem>
                    )}
                    {canRecall(msg) && (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                onClick={() => setRecallConfirmId(msg.id)}
                                className="gap-2 text-destructive focus:text-destructive"
                            >
                                <RotateCcw size={14} />
                                Thu hồi
                            </ContextMenuItem>
                        </>
                    )}
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    return (
        <>
            <div ref={containerRef} className="flex-1 overflow-y-auto bg-muted/20">
                <div className="py-6 flex flex-col min-h-full">
                    {/* Lazy load sentinel */}
                    <div
                        ref={sentinelRef}
                        className="flex justify-center h-8 items-center"
                    >
                        {isLoadingMore && (
                            <span className="text-[11px] text-muted-foreground animate-pulse">
                                Đang tải tin nhắn cũ hơn...
                            </span>
                        )}
                        {!isLoadingMore && hasMore && (
                            <span className="text-[11px] text-muted-foreground/50">
                                ↑ Kéo lên để xem thêm
                            </span>
                        )}
                    </div>

                    {messages.map((msg, index) => (
                        <div key={`msg-group-${msg.id}`}>
                            {renderTimeSeparator(msg, index)}
                            {renderMessage(msg, index)}
                        </div>
                    ))}
                    <div ref={scrollEndRef} />
                </div>
            </div>

            {/* Recall confirmation dialog */}
            <Dialog open={!!recallConfirmId} onOpenChange={open => !open && setRecallConfirmId(null)}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Thu hồi tin nhắn?</DialogTitle>
                        <DialogDescription>
                            Tin nhắn sẽ bị đánh dấu là đã thu hồi với tất cả mọi người trong cuộc hội thoại. Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setRecallConfirmId(null)}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (recallConfirmId) onRecall(recallConfirmId);
                                setRecallConfirmId(null);
                            }}
                        >
                            Thu hồi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
