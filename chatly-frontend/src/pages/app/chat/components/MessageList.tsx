import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check, CheckCheck, Reply, RotateCcw, Pencil, X, Send, FileText, Download, Copy, Trash2, AlertCircle, RefreshCcw, SmilePlus } from "lucide-react";
import { toast } from "sonner";
import type { Message, ChatUser, Reaction } from "@/types/message";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageListProps {
    messages: Message[];
    participant: ChatUser;
    conversationType: ConversationType;
    participantDirectory: Record<string, ChatUser>;
    currentUserId: string;
    onReply: (msg: Message) => void;
    onRecall: (messageId: string) => void;
    onEdit: (messageId: string, newContent: string) => void;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onOpenSenderProfile?: (userId: string) => void;
    onLoadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
    failedMessages?: Array<{ id: string, content: string, attachments?: any, replyToId?: string | null }>;
    onRetryMessage?: (id: string) => void;
    onRemoveFailedMessage?: (id: string) => void;
    highlightedMessageId?: string | null;
}

const RECALL_LIMIT_MS = 24 * 60 * 60 * 1000;
const EDIT_LIMIT_MS = 15 * 60 * 1000;
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export function MessageList({
    messages,
    participant,
    conversationType,
    participantDirectory,
    currentUserId,
    onReply,
    onRecall,
    onEdit,
    onDelete,
    onReact,
    onOpenSenderProfile,
    onLoadMore,
    isLoadingMore,
    hasMore,
    failedMessages = [],
    onRetryMessage,
    onRemoveFailedMessage,
    highlightedMessageId,
}: MessageListProps) {
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const isFirstMount = useRef(true);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");

    // Recall confirm dialog state
    const [recallConfirmId, setRecallConfirmId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Lightbox state
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const allImages = useMemo(() => {
        const images: { id: string; url: string; name: string }[] = [];
        messages.forEach(msg => {
            if (msg.attachments) {
                msg.attachments.forEach((att, i) => {
                    if (att.type?.startsWith("image/")) {
                        images.push({ id: `${msg.id}-${i}`, url: att.url, name: att.name ?? "image" });
                    }
                });
            }
        });
        return images;
    }, [messages]);

    // Find the last message sent by me that has been seen by others
    const lastSeenByOthersIdx = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (
                msg.senderId === currentUserId &&
                !msg.recalled &&
                msg.readBy &&
                msg.readBy.some((r) => r.userId !== currentUserId)
            ) {
                return i;
            }
        }
        return -1;
    }, [messages, currentUserId]);

    const formatSeenTime = (readAt: string): string => {
        const diff = Date.now() - new Date(readAt).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return "vừa xem";
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

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

    // Scroll to highlighted search result
    useEffect(() => {
        if (!highlightedMessageId || !containerRef.current) return;
        const el = containerRef.current.querySelector(`[data-message-id="${highlightedMessageId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("search-highlight");
            const timer = setTimeout(() => el.classList.remove("search-highlight"), 2000);
            return () => clearTimeout(timer);
        }
    }, [highlightedMessageId]);

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
                data-message-id={msg.id}
                className={cn(
                    "flex gap-2 group px-4 transition-colors duration-500",
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
                                {/* Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className={cn("flex flex-col gap-2", msg.content ? "mt-2" : "")}>
                                        {msg.attachments.map((att, i) => {
                                            const isImage = att.type?.startsWith("image/");
                                            if (isImage) {
                                                const id = `${msg.id}-${i}`;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={i}
                                                        onClick={() => setLightboxIndex(allImages.findIndex(img => img.id === id))}
                                                        className="block text-left transition-opacity hover:opacity-90"
                                                    >
                                                        <img
                                                            src={att.url}
                                                            alt={att.name ?? "image"}
                                                            className="max-w-60 max-h-60 rounded-xl object-cover"
                                                        />
                                                    </button>
                                                );
                                            }
                                            return (
                                                <a
                                                    key={i}
                                                    href={att.url}
                                                    download={att.name}
                                                    className={cn(
                                                        "flex items-center gap-2 rounded-xl px-3 py-2 text-xs no-underline",
                                                        isMe
                                                            ? "bg-white/20 text-white hover:bg-white/30"
                                                            : "bg-muted/60 text-foreground hover:bg-muted border border-border/50",
                                                    )}
                                                >
                                                    <FileText size={18} className="shrink-0" />
                                                    <span className="flex-1 truncate max-w-40">{att.name ?? "File"}</span>
                                                    <Download size={14} className="shrink-0 opacity-60" />
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}
                                {msg.edited && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className={cn("ml-1.5 text-[10px] opacity-70 cursor-help")}>
                                                (đã chỉnh sửa)
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            {msg.editedAt && `Sửa lúc: ${new Date(msg.editedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, ${new Date(msg.editedAt).toLocaleDateString("vi-VN")}`}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        )}

                        {/* Action buttons (on hover) — hidden for recalled messages */}
                        {!msg.recalled && !isBeingEdited && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <div className="relative group/react">
                                    <button
                                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                                        title="Bày tỏ cảm xúc"
                                    >
                                        <SmilePlus size={14} />
                                    </button>
                                    <div
                                        className={cn(
                                            "absolute bottom-full mb-1 hidden group-hover/react:flex items-center gap-0.5 bg-popover border border-border rounded-full px-1 py-0.5 shadow-lg z-50",
                                            isMe ? "right-0" : "left-0",
                                        )}
                                    >
                                        {QUICK_EMOJIS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => onReact(msg.id, emoji)}
                                                className="hover:scale-125 transition-transform text-base px-0.5"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onReply(msg)}
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                                    title="Trả lời"
                                >
                                    <Reply size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Reaction badges */}
                    {msg.reactions && msg.reactions.length > 0 && (
                        <div className={cn("flex flex-wrap gap-1 mt-0.5 px-1", isMe ? "justify-end" : "justify-start")}>
                            {Object.entries(
                                msg.reactions.reduce<Record<string, string[]>>((acc, r) => {
                                    (acc[r.emoji] ??= []).push(r.userId);
                                    return acc;
                                }, {}),
                            ).map(([emoji, userIds]) => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(msg.id, emoji)}
                                    className={cn(
                                        "flex items-center gap-0.5 text-xs rounded-full px-1.5 py-0.5 border transition-colors",
                                        userIds.includes(currentUserId)
                                            ? "bg-brand/10 border-brand/40 text-brand"
                                            : "bg-muted/60 border-border/50 text-muted-foreground hover:bg-muted",
                                    )}
                                >
                                    <span>{emoji}</span>
                                    {userIds.length > 1 && <span>{userIds.length}</span>}
                                </button>
                            ))}
                        </div>
                    )}

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

                    {/* Seen indicator — only on the last message seen by others */}
                    {isMe && index === lastSeenByOthersIdx && !msg.recalled && (() => {
                        const readers = msg.readBy.filter((r) => r.userId !== currentUserId);
                        if (readers.length === 0) return null;

                        if (conversationType === "PRIVATE") {
                            const receipt = readers[0];
                            const reader = participantDirectory[receipt.userId];
                            return (
                                <div className="flex items-center gap-1 px-1 mt-0.5 justify-end">
                                    {reader?.avatarUrl && (
                                        <Avatar className="h-3.5 w-3.5">
                                            <AvatarImage src={reader.avatarUrl} />
                                            <AvatarFallback className="text-[8px]">
                                                {reader.displayName.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                        Đã xem {formatSeenTime(receipt.readAt)}
                                    </span>
                                </div>
                            );
                        }

                        // GROUP: show up to 3 reader avatars + overflow count
                        return (
                            <div className="flex items-center gap-0.5 px-1 mt-0.5 justify-end">
                                <span className="text-[10px] text-muted-foreground mr-1">
                                    Đã xem
                                </span>
                                {readers.slice(0, 3).map((r) => {
                                    const reader = participantDirectory[r.userId];
                                    return (
                                        <Avatar key={r.userId} className="h-3.5 w-3.5">
                                            <AvatarImage src={reader?.avatarUrl} />
                                            <AvatarFallback className="text-[8px]">
                                                {reader?.displayName?.charAt(0) ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                    );
                                })}
                                {readers.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">
                                        +{readers.length - 3}
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        );

        /* Wrap messages in context menu */
        if (isBeingEdited) return bubble;

        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>{bubble}</ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    {!msg.recalled && (
                        <ContextMenuItem
                            onClick={() => onReply(msg)}
                            className="gap-2"
                        >
                            <Reply size={14} />
                            Trả lời
                        </ContextMenuItem>
                    )}
                    {msg.type === "TEXT" && !msg.recalled && (
                        <ContextMenuItem
                            onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                toast.success("Đã copy tin nhắn");
                            }}
                            className="gap-2"
                        >
                            <Copy size={14} />
                            Copy tin nhắn
                        </ContextMenuItem>
                    )}
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
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        onClick={() => setDeleteConfirmId(msg.id)}
                        className="gap-2 text-destructive focus:text-destructive"
                    >
                        <Trash2 size={14} />
                        Xóa chỉ ở phía tôi
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    return (
        <TooltipProvider>
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

                    {/* Render failed messages */}
                    {failedMessages.map((fmsg) => (
                        <div key={fmsg.id} className="flex flex-col mb-4 items-end slide-in-from-right-2 animate-in duration-300">
                            <div className="flex max-w-[75%] gap-2 items-center">
                                <span className="text-xs text-destructive flex items-center bg-destructive/10 px-2 py-1 rounded-full gap-1">
                                    <AlertCircle size={12} /> Lỗi gửi
                                </span>
                                <div className="bg-destructive/20 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm border border-destructive/20 opacity-80 break-words select-text">
                                    {fmsg.content || (fmsg.attachments?.length ? "[Đính kèm]" : "")}
                                </div>
                            </div>
                            <div className="flex gap-2 items-center text-xs mt-1 mr-1 text-muted-foreground">
                                <button onClick={() => onRetryMessage?.(fmsg.id)} className="flex items-center gap-1 hover:text-brand transition cursor-pointer">
                                    <RefreshCcw size={12} /> Thử lại
                                </button>
                                <span>•</span>
                                <button onClick={() => onRemoveFailedMessage?.(fmsg.id)} className="flex items-center gap-1 hover:text-destructive transition cursor-pointer">
                                    <Trash2 size={12} /> Xoá
                                </button>
                            </div>
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

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Xóa tin nhắn?</DialogTitle>
                        <DialogDescription>
                            Tin nhắn sẽ bị xóa khỏi giao diện của bạn. Người khác vẫn có thể thấy tin nhắn này. Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteConfirmId) onDelete(deleteConfirmId);
                                setDeleteConfirmId(null);
                            }}
                        >
                            Xóa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox Gallery Overlay */}
            {lightboxIndex !== null && allImages[lightboxIndex] && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center pointer-events-auto outline-none animate-in fade-in duration-200"
                    tabIndex={-1}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setLightboxIndex(null);
                        if (e.key === "ArrowLeft" && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
                        if (e.key === "ArrowRight" && lightboxIndex < allImages.length - 1) setLightboxIndex(lightboxIndex + 1);
                    }}
                    autoFocus
                >
                    {/* Top bar */}
                    <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white/70">
                        <span className="text-sm">
                            {lightboxIndex + 1} / {allImages.length}
                        </span>
                        <div className="flex items-center gap-4">
                            <a 
                                href={allImages[lightboxIndex].url}
                                download={allImages[lightboxIndex].name}
                                target="_blank" 
                                rel="noreferrer"
                                className="hover:text-white transition-colors"
                                title="Tải xuống"
                            >
                                <Download size={20} />
                            </a>
                            <button 
                                onClick={() => setLightboxIndex(null)}
                                className="hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Prev/Next */}
                    {lightboxIndex > 0 && (
                        <button 
                            className="absolute left-4 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                            onClick={() => setLightboxIndex(lightboxIndex - 1)}
                        >
                            <ChevronLeft size={36} />
                        </button>
                    )}
                    {lightboxIndex < allImages.length - 1 && (
                        <button 
                            className="absolute right-4 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                            onClick={() => setLightboxIndex(lightboxIndex + 1)}
                        >
                            <ChevronRight size={36} />
                        </button>
                    )}

                    {/* Main Image */}
                    <img 
                        src={allImages[lightboxIndex].url} 
                        alt={allImages[lightboxIndex].name} 
                        className="max-h-[90vh] max-w-[90vw] object-contain select-none"
                    />
                </div>
            )}
        </TooltipProvider>
    );
}
