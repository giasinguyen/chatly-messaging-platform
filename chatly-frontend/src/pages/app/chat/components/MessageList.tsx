import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    Check,
    CheckCheck,
    Reply,
    RotateCcw,
    Pencil,
    X,
    Send,
    Download,
    Copy,
    Trash2,
    AlertCircle,
    RefreshCcw,
    SmilePlus,
    Pin,
    BarChart3,
    Forward,
    PhoneCall,
    Star,
    AlertTriangle,
    IdCard,
    Clock,
} from "lucide-react";
import {
    FilePdf,
    MicrosoftWordLogo,
    MicrosoftExcelLogo,
    FileCsv,
    MicrosoftPowerpointLogo,
    FileImage as PhosphorFileImage,
    FileVideo as PhosphorFileVideo,
    FileAudio as PhosphorFileAudio,
    FileZip,
    FileCode as PhosphorFileCode,
    File as PhosphorFile,
} from "phosphor-react";
import { toast } from "sonner";
import type { Message, ChatUser } from "@/types/message";
import type { ConversationType } from "@/types/conversation";
import type { ContactResponse } from "@/types/contact";
import { ReplyPreview } from "./ReplyPreview";
import { PollVoterPopover } from "./PollVoterPopover";

function getFileIcon(mimeType?: string, fileName?: string) {
    const t = mimeType?.toLowerCase() ?? '';
    const ext = (fileName?.split('.').pop() ?? '').toLowerCase();
    if (t.includes('pdf') || ext === 'pdf')
        return <FilePdf size={18} className="shrink-0" color="#ef4444" weight="duotone" />;
    if (t.includes('word') || t.includes('document') || ext === 'docx' || ext === 'doc')
        return <MicrosoftWordLogo size={18} className="shrink-0" color="#2563eb" weight="duotone" />;
    if (t.includes('sheet') || t.includes('excel') || ext === 'xlsx' || ext === 'xls')
        return <MicrosoftExcelLogo size={18} className="shrink-0" color="#16a34a" weight="duotone" />;
    if (ext === 'csv')
        return <FileCsv size={18} className="shrink-0" color="#16a34a" weight="duotone" />;
    if (t.includes('presentation') || t.includes('powerpoint') || ext === 'pptx' || ext === 'ppt')
        return <MicrosoftPowerpointLogo size={18} className="shrink-0" color="#ea580c" weight="duotone" />;
    if (t.startsWith('image/'))
        return <PhosphorFileImage size={18} className="shrink-0" color="#7c3aed" weight="duotone" />;
    if (t.startsWith('video/'))
        return <PhosphorFileVideo size={18} className="shrink-0" color="#db2777" weight="duotone" />;
    if (t.startsWith('audio/'))
        return <PhosphorFileAudio size={18} className="shrink-0" color="#d97706" weight="duotone" />;
    if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('7z') || ext === 'zip' || ext === 'rar' || ext === '7z')
        return <FileZip size={18} className="shrink-0" color="#92400e" weight="duotone" />;
    if (t.includes('json') || t.includes('xml') || t.includes('javascript') || t.includes('typescript') || ['js','ts','jsx','tsx','json','xml','html','css','py','java'].includes(ext))
        return <PhosphorFileCode size={18} className="shrink-0" color="#475569" weight="duotone" />;
    if (t.includes('text') || ext === 'txt')
        return <PhosphorFile size={18} className="shrink-0" color="#94a3b8" weight="duotone" />;
    return <PhosphorFile size={18} className="shrink-0" weight="duotone" />;
}
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
    onForward: (msg: Message) => void;
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
    highlightKeyword?: string | null;
    onVotePoll?: (messageId: string, optionIndex: number) => void;
    onClosePoll?: (messageId: string) => void;
    onTogglePin?: (messageId: string) => void;
    onCallAgain?: (calleeId: string, calleeName: string, calleeAvatar?: string) => void;
    onTagPriority?: (messageId: string, priority: string) => void;
    contacts?: ContactResponse[];
    onAddFriend?: (userId: string) => void;
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
    onForward,
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
    highlightKeyword,
    onVotePoll,
    onClosePoll,
    onTogglePin,
    onCallAgain,
    onTagPriority,
    contacts = [],
    onAddFriend,
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
        if (minutes < 1) return "just seen";
        if (minutes < 60) return `${minutes} minutes ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        return `${days} days ago`;
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
            <div key={`time-sep-${msg.id}`} className="px-4 py-2 text-center">
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>
        );
    };

    const canRecall = (msg: Message): boolean => {
        if (msg.recalled) return false;
        if (msg.senderId !== currentUserId) return false;
        if (msg.type === "SYSTEM" || msg.type === "CALL") return false;
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

    const canForward = (msg: Message): boolean => {
        if (msg.recalled) return false;
        return ["TEXT", "IMAGE", "FILE", "GIF", "STICKER"].includes(msg.type);
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

    const renderHighlightedText = (text: string): React.ReactNode => {
        if (!highlightKeyword?.trim()) return text;
        const escaped = highlightKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const parts = text.split(new RegExp(`(${escaped})`, "gi"));
        if (parts.length === 1) return text;
        return (
            <>
                {parts.map((part, i) =>
                    i % 2 === 1 ? (
                        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5">
                            {part}
                        </mark>
                    ) : (
                        part
                    ),
                )}
            </>
        );
    };

    const renderMessage = (msg: Message, index: number) => {
        // SYSTEM messages render as centered labels
        if (msg.type === "SYSTEM") {
            return (
                <div key={msg.id} className="flex justify-center my-2 px-4">
                    <div className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-zinc-800/60 border border-border/40 rounded-full px-3.5 py-1.5 max-w-[85%]">
                        <span className="text-xs text-muted-foreground text-center">{msg.content}</span>
                    </div>
                </div>
            );
        }

        // CALL messages — aligned to sender
        if (msg.type === "CALL") {
            let callData: { callType?: string; status?: string; duration?: number } = {};
            try { callData = JSON.parse(msg.content); } catch { /* ignore */ }
            const isMissed = callData.status === "MISSED" || callData.status === "REJECTED";
            const isVideo = callData.callType === "VIDEO";
            const duration = callData.duration ?? 0;
            const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
            const isMe = msg.senderId === currentUserId;
            const sender = participantDirectory[msg.senderId] ?? participant;
            // calleeId: if I started the call, call back targets the participant;
            // if they started it (I missed), call back targets the sender.
            const calleeId = isMe ? participant.id : msg.senderId;
            const typeLabel = isVideo ? "video" : "audio";
            const statusLabel = isMissed ? `Missed ${typeLabel} call` : `${isVideo ? "Video" : "Audio"} call`;
            return (
                <div key={msg.id} className={cn("flex my-2 px-4", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                        "inline-flex items-start gap-2 rounded-2xl px-4 py-2.5 border flex-col max-w-[240px]",
                        isMissed
                            ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                            : "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                    )}>
                        <div className="flex items-center gap-2">
                            <PhoneCall size={13} />
                            <span className="text-xs font-medium">{statusLabel}</span>
                        </div>
                        {!isMissed && duration > 0 && (
                            <span className="text-[11px] opacity-70">{formatDuration(duration)}</span>
                        )}
                        {isMissed && !isMe && onCallAgain && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="self-stretch h-7 text-[11px] px-2 hover:bg-red-200/50 dark:hover:bg-red-800/50 justify-center"
                                onClick={() => onCallAgain(calleeId, sender.displayName, sender.avatarUrl)}
                            >
                                <PhoneCall size={12} className="mr-1" />
                                Call back
                            </Button>
                        )}
                    </div>
                </div>
            );
        }

        const isMe = msg.senderId === currentUserId;
        const sender = participantDirectory[msg.senderId] ?? participant;
        const senderShortName = sender.displayName.split(" ").slice(-1)[0] || "User";
        const repliedMsg = msg.replyToId
            ? messages.find((m) => m.id === msg.replyToId)
            : null;
        const replySenderName = repliedMsg
            ? repliedMsg.senderId === currentUserId
                ? "You"
                : (participantDirectory[repliedMsg.senderId]?.displayName || participant.displayName).split(" ").slice(-1)[0]
            : undefined;
        const isBeingEdited = editingId === msg.id;

        const isPoll = msg.type === "POLL";

        const bubble = (
            <div
                data-message-id={msg.id}
                className={cn(
                    "flex gap-2 group px-4 transition-colors duration-500",
                    isLastInGroup(msg, index) ? "mb-3" : "mb-0.5",
                    isPoll ? "justify-center" : (isMe ? "flex-row-reverse" : "flex-row"),
                )}
            >
                {!isMe && !isPoll && shouldShowAvatar(msg, index) && (
                    <button
                        type="button"
                        onClick={() => onOpenSenderProfile?.(msg.senderId)}
                        className="shrink-0"
                        title="View user info"
                    >
                        <Avatar className="h-8 w-8 align-bottom border border-border/30 shrink-0">
                            <AvatarImage src={sender.avatarUrl} />
                            <AvatarFallback>{sender.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </button>
                )}
                {!isMe && !isPoll && !shouldShowAvatar(msg, index) && (
                    <div className="h-8 w-8 shrink-0" />
                )}

                <div className={cn("flex flex-col", !isPoll && "max-w-[70%]", isPoll ? "items-center" : (isMe ? "items-end" : "items-start"))}>
                    {!isMe && !isPoll && conversationType === "GROUP" && shouldShowAvatar(msg, index) && (
                        <button
                            type="button"
                            onClick={() => onOpenSenderProfile?.(msg.senderId)}
                            className="text-[11px] text-muted-foreground mb-1 px-1 hover:text-foreground transition-colors"
                            title="View user info"
                        >
                            {senderShortName}
                        </button>
                    )}

                    {/* Pinned indicator */}
                    {msg.pinned && (
                        <div className={cn("flex items-center gap-1 px-1 mb-0.5", isPoll ? "justify-center" : (isMe ? "justify-end" : "justify-start"))}>
                            <Pin size={10} className="text-amber-500" />
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">Pinned</span>
                        </div>
                    )}

                    {/* Bubble + Reply button */}
                    <div className={cn("flex items-end gap-1", isPoll ? "flex-row justify-center" : (isMe ? "flex-row-reverse" : "flex-row"))}>
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
                                Message recalled
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
                                    title="Save"
                                >
                                    <Send size={12} />
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground shrink-0"
                                    title="Cancel"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : msg.type === "POLL" && msg.poll ? (
                            /* Poll bubble — centered, Zalo-style */
                            (() => {
                                const poll = msg.poll;
                                const isClosed = poll.closed === true;
                                const totalVoters = new Set(Object.values(poll.votes ?? {}).flat()).size;
                                const myVotedOptions = Object.entries(poll.votes ?? {})
                                    .filter(([, voters]) => voters.includes(currentUserId))
                                    .map(([idx]) => Number(idx));
                                return (
                                    <div className="w-80 rounded-2xl shadow-sm overflow-hidden border border-border/50 bg-background dark:bg-zinc-900">
                                        {/* Poll header */}
                                        <div className="px-4 py-3 flex items-center gap-2 bg-brand/10 border-b border-brand/20">
                                            <BarChart3 size={16} className="text-brand shrink-0" />
                                            <span className="text-sm font-semibold text-foreground flex-1">{poll.question}</span>
                                            {isClosed && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border shrink-0">Ended</span>
                                            )}
                                        </div>
                                        {/* Poll options */}
                                        <div className="px-3 py-2 space-y-1.5">
                                            {poll.options.map((option, idx) => {
                                                const voterCount = (poll.votes?.[String(idx)] ?? []).length;
                                                const pct = totalVoters > 0 ? Math.round((voterCount / totalVoters) * 100) : 0;
                                                const isVoted = myVotedOptions.includes(idx);
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        disabled={isClosed}
                                                        onClick={() => !isClosed && onVotePoll?.(msg.id, idx)}
                                                        className={cn(
                                                            "relative w-full text-left rounded-lg px-3 py-2 text-sm transition-all overflow-hidden border",
                                                            isClosed
                                                                ? "opacity-70 cursor-default border-border/30"
                                                                : isVoted
                                                                    ? "border-brand/60 bg-brand/10 font-medium"
                                                                    : "border-border/40 hover:border-brand/40 hover:bg-brand/5",
                                                        )}
                                                    >
                                                        {/* Progress bar */}
                                                        <div
                                                            className={cn("absolute inset-y-0 left-0 transition-all duration-300", isVoted ? "bg-brand/15" : "bg-muted/40")}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                        <div className="relative flex items-center justify-between gap-2">
                                                            <span className="truncate">{option}</span>
                                                            <PollVoterPopover
                                                                voterIds={poll.votes?.[String(idx)] ?? []}
                                                                participantDirectory={participantDirectory}
                                                                optionLabel={option}
                                                                anonymous={poll.anonymous}
                                                            >
                                                                <span className="text-xs text-muted-foreground shrink-0 cursor-pointer hover:underline">
                                                                    {voterCount > 0 && `${pct}%`}
                                                                </span>
                                                            </PollVoterPopover>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* Poll footer */}
                                        <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/30 flex items-center justify-between">
                                            <PollVoterPopover
                                                voterIds={[...new Set(Object.values(poll.votes ?? {}).flat())]}
                                                participantDirectory={participantDirectory}
                                                optionLabel="All voters"
                                                anonymous={poll.anonymous}
                                            >
                                                <span className="cursor-pointer hover:underline">
                                                    {totalVoters} voter{totalVoters !== 1 ? "s" : ""}
                                                </span>
                                            </PollVoterPopover>
                                            <div className="flex items-center gap-2">
                                                <span>{poll.multipleChoice ? "Multiple choices" : "Single choice"}</span>
                                                {isMe && !isClosed && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onClosePoll?.(msg.id)}
                                                        className="text-[11px] text-red-500 hover:text-red-600 hover:underline font-medium transition-colors"
                                                    >
                                                        End poll
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {poll.deadline && (
                                            <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/30 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(poll.deadline).getTime() < Date.now() ? (
                                                    <span className="text-red-500">Expired</span>
                                                ) : (
                                                    <span>Ends {new Date(poll.deadline).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()
                        ) : (msg.type === "GIF" || msg.type === "STICKER") ? (
                            /* GIF / Sticker bubble — no background, just the image */
                            <div>
                                {repliedMsg && (
                                    <div className={cn(
                                        "px-3 py-1.5 mb-1 rounded-xl text-sm",
                                        isMe
                                            ? "bg-brand/10 border border-brand/20"
                                            : "bg-muted/50 border border-border/40",
                                    )}>
                                        <ReplyPreview
                                            replyMessage={repliedMsg}
                                            participant={participant}
                                            senderName={replySenderName}
                                            currentUserId={currentUserId}
                                            isMe={isMe}
                                        />
                                    </div>
                                )}
                                <img
                                    src={msg.content}
                                    alt={msg.type === "GIF" ? "GIF" : "Sticker"}
                                    loading="lazy"
                                    className={cn(
                                        "rounded-xl object-contain",
                                        msg.type === "GIF"
                                            ? "max-w-60 max-h-50"
                                            : "w-35 h-auto",
                                    )}
                                />
                            </div>
                        ) : msg.type === "VCARD" ? (
                            /* Business card bubble — Zalo-style */
                            (() => {
                                let card: { id?: string; displayName?: string; username?: string; avatarUrl?: string } = {};
                                try { card = JSON.parse(msg.content); } catch {}
                                return (
                                    <div className="w-60 rounded-2xl border border-border/60 bg-background dark:bg-zinc-900 shadow-sm overflow-hidden">
                                        {/* Card header — mini label */}
                                        <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 border-b border-border/40">
                                            <IdCard size={12} className="text-muted-foreground shrink-0" />
                                            <span className="text-[11px] text-muted-foreground font-medium">Contact card</span>
                                        </div>
                                        {/* Card body */}
                                        <div className="flex items-center gap-3 px-3 py-3">
                                            <div className="w-12 h-12 rounded-full bg-brand/15 flex items-center justify-center text-base font-bold text-brand shrink-0 overflow-hidden ring-2 ring-brand/20">
                                                {card.avatarUrl ? (
                                                    <img src={card.avatarUrl} alt="" className="w-12 h-12 object-cover" />
                                                ) : (
                                                    <span>{(card.displayName ?? "U").charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">
                                                    {card.displayName ?? "User"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    @{card.username ?? ""}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Card footer — friend-status-aware */}
                                        {card.id && (() => {
                                            const friendContact = contacts.find(
                                                (c) => c.contact.id === card.id || c.user.id === card.id,
                                            );
                                            const friendStatus = friendContact?.status;
                                            const isSelf = card.id === currentUserId;
                                            return (
                                                <div className="border-t border-border/40 flex">
                                                    {(isSelf || friendStatus === "ACCEPTED") ? (
                                                        <span className="flex-1 py-2 text-xs font-semibold text-green-600 text-center">
                                                            ✓ Friends
                                                        </span>
                                                    ) : friendStatus === "PENDING" ? (
                                                        <span className="flex-1 py-2 text-xs font-semibold text-muted-foreground text-center">
                                                            Request sent
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => onAddFriend?.(card.id!)}
                                                            className="flex-1 py-2 text-xs font-semibold text-brand hover:bg-brand/5 transition-colors"
                                                        >
                                                            Add friend
                                                        </button>
                                                    )}
                                                    {onOpenSenderProfile && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onOpenSenderProfile(card.id!)}
                                                            className="flex-1 py-2 text-xs font-semibold text-brand hover:bg-brand/5 transition-colors border-l border-border/40"
                                                        >
                                                            View profile
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })()
                        ) : (
                            /* Normal bubble */
                            <div
                                className={cn(
                                    "px-3 py-2 text-sm shadow-sm transition-all",
                                    isMe
                                        ? "bg-brand text-white rounded-2xl"
                                        : "bg-muted/75 border border-border/60 text-foreground dark:bg-zinc-800/90 dark:border-zinc-700 rounded-2xl",
                                    msg.priority === "URGENT" && "ring-2 ring-red-500/60",
                                    msg.priority === "IMPORTANT" && "ring-2 ring-amber-500/60",
                                )}
                            >
                                {/* Priority badge */}
                                {msg.priority && (
                                    <div className={cn(
                                        "flex items-center gap-1 text-[10px] font-semibold mb-1 uppercase tracking-wide",
                                        msg.priority === "URGENT" ? "text-red-500" : "text-amber-500",
                                        isMe && msg.priority === "URGENT" && "text-red-200",
                                        isMe && msg.priority === "IMPORTANT" && "text-amber-200",
                                    )}>
                                        {msg.priority === "URGENT" ? <AlertTriangle size={11} /> : <Star size={11} />}
                                        {msg.priority}
                                    </div>
                                )}
                                {repliedMsg && (
                                    <ReplyPreview
                                        replyMessage={repliedMsg}
                                        participant={participant}
                                        senderName={replySenderName}
                                        currentUserId={currentUserId}
                                        isMe={isMe}
                                    />
                                )}
                                {msg.content && (() => {
                                    const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
                                    // Build mention names from participants (sorted longest-first to avoid partial matches)
                                    const mentionNames = [
                                        ...Object.values(participantDirectory).flatMap(u => [u.displayName, u.username]),
                                        'all',
                                    ].filter(Boolean).sort((a, b) => b.length - a.length);
                                    const escapedNames = mentionNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                                    const MENTION_REGEX_STR = escapedNames.length > 0 ? `@(?:${escapedNames.join('|')})` : '@\\S+';
                                    const COMBINED_REGEX = new RegExp(`(https?:\\/\\/[^\\s<>"]+|${MENTION_REGEX_STR})`, 'g');
                                    const parts = msg.content.split(COMBINED_REGEX);
                                    const hasSpecial = parts.some(p => /^https?:\/\//.test(p) || /^@/.test(p));
                                    if (!hasSpecial) return <span>{renderHighlightedText(msg.content)}</span>;
                                    return (
                                        <span>
                                            {parts.map((part, i) => {
                                                if (/^https?:\/\//.test(part)) {
                                                    return (
                                                        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                                                            className={cn("underline break-all", isMe ? "text-white/90 hover:text-white" : "text-brand hover:text-brand/80")}>
                                                            {part}
                                                        </a>
                                                    );
                                                }
                                                if (/^@/.test(part)) {
                                                    const mentionName = part.replace(/^@/, '');
                                                    const mentionedUser = mentionName === 'all'
                                                        ? null
                                                        : Object.values(participantDirectory).find(
                                                            (u) => u.displayName === mentionName || u.username === mentionName,
                                                        );
                                                    if (mentionedUser && onOpenSenderProfile) {
                                                        return (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => onOpenSenderProfile(mentionedUser.id)}
                                                                className={cn(
                                                                    "font-semibold cursor-pointer hover:underline",
                                                                    isMe ? "text-white/90" : "text-brand",
                                                                )}
                                                            >
                                                                {part}
                                                            </button>
                                                        );
                                                    }
                                                    return (
                                                        <span key={i} className={cn(
                                                            "font-semibold",
                                                            isMe ? "text-white/90" : "text-brand",
                                                        )}>
                                                            {part}
                                                        </span>
                                                    );
                                                }
                                                return <span key={i}>{renderHighlightedText(part)}</span>;
                                            })}
                                        </span>
                                    );
                                })()}
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
                                            const isVideo = att.type?.startsWith("video/");
                                            if (isVideo) {
                                                return (
                                                    <div key={i} className="max-w-xs">
                                                        <video
                                                            src={att.url}
                                                            controls
                                                            className="rounded-xl max-w-full max-h-60 block"
                                                        />
                                                        {att.name && (
                                                            <p className={cn("text-[11px] mt-1 truncate", isMe ? "text-white/70" : "text-muted-foreground")}>
                                                                {att.name}
                                                            </p>
                                                        )}
                                                    </div>
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
                                                    {getFileIcon(att.type, att.name)}
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
                                                (edited)
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            {msg.editedAt && `Edited at: ${new Date(msg.editedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}, ${new Date(msg.editedAt).toLocaleDateString("en-US")}`}
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
                                        title="React"
                                    >
                                        <SmilePlus size={14} />
                                    </button>
                                    <div
                                        className={cn(
                                            "absolute bottom-full pb-2 hidden group-hover/react:flex flex-col items-center z-50",
                                            isMe ? "right-0" : "left-0",
                                        )}
                                    >
                                    <div className="flex items-center gap-0.5 bg-popover border border-border rounded-full px-1 py-0.5 shadow-lg">
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
                                </div>
                                <button
                                    onClick={() => onReply(msg)}
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                                    title="Reply"
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
                                {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
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
                                        Seen {formatSeenTime(receipt.readAt)}
                                    </span>
                                </div>
                            );
                        }

                        // GROUP: show up to 3 reader avatars + overflow count
                        return (
                            <div className="flex items-center gap-0.5 px-1 mt-0.5 justify-end">
                                <span className="text-[10px] text-muted-foreground mr-1">
                                    Seen
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
                            Reply
                        </ContextMenuItem>
                    )}
                    {canForward(msg) && (
                        <ContextMenuItem
                            onClick={() => onForward(msg)}
                            className="gap-2"
                        >
                            <Forward size={14} />
                            Forward
                        </ContextMenuItem>
                    )}
                    {msg.type === "TEXT" && !msg.recalled && (
                        <ContextMenuItem
                            onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                toast.success("Message copied");
                            }}
                            className="gap-2"
                        >
                            <Copy size={14} />
                            Copy message
                        </ContextMenuItem>
                    )}
                    {canEdit(msg) && (
                        <ContextMenuItem
                            onClick={() => startEdit(msg)}
                            className="gap-2"
                        >
                            <Pencil size={14} />
                            Edit
                        </ContextMenuItem>
                    )}
                    {!msg.recalled && onTogglePin && (
                        <ContextMenuItem
                            onClick={() => onTogglePin(msg.id)}
                            className="gap-2"
                        >
                            <Pin size={14} />
                            {msg.pinned ? "Unpin" : "Pin message"}
                        </ContextMenuItem>
                    )}
                    {!msg.recalled && onTagPriority && (
                        <>
                            <ContextMenuItem
                                onClick={() => onTagPriority(msg.id, "IMPORTANT")}
                                className="gap-2"
                            >
                                <Star size={14} />
                                {msg.priority === "IMPORTANT" ? "Remove important" : "Mark important"}
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() => onTagPriority(msg.id, "URGENT")}
                                className="gap-2"
                            >
                                <AlertTriangle size={14} />
                                {msg.priority === "URGENT" ? "Remove urgent" : "Mark urgent"}
                            </ContextMenuItem>
                        </>
                    )}
                    {canRecall(msg) && (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                onClick={() => setRecallConfirmId(msg.id)}
                                className="gap-2"
                            >
                                <RotateCcw size={14} />
                                Recall
                            </ContextMenuItem>
                        </>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        onClick={() => setDeleteConfirmId(msg.id)}
                        className="gap-2 text-destructive focus:text-destructive"
                    >
                        <Trash2 size={14} />
                        Delete for me
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    return (
        <TooltipProvider>
            <div ref={containerRef} className="flex-1 overflow-y-auto bg-muted/20 hide-scrollbar">
                <div className="py-6 flex flex-col min-h-full">
                    {/* Lazy load sentinel */}
                    <div
                        ref={sentinelRef}
                        className="flex justify-center h-8 items-center"
                    >
                        {isLoadingMore && (
                            <span className="text-[11px] text-muted-foreground animate-pulse">
                                Loading older messages...
                            </span>
                        )}
                        {!isLoadingMore && hasMore && (
                            <span className="text-[11px] text-muted-foreground/50">
                                ↑ Pull up to see more
                            </span>
                        )}
                    </div>

                    {messages.map((msg, index) => (
                        <div key={`msg-group-${msg.id}-${index}`}>
                            {renderTimeSeparator(msg, index)}
                            {renderMessage(msg, index)}
                        </div>
                    ))}

                    {/* Render failed messages */}
                    {failedMessages.map((fmsg) => (
                        <div key={fmsg.id} className="flex flex-col mb-4 items-end slide-in-from-right-2 animate-in duration-300">
                            <div className="flex max-w-[75%] gap-2 items-center">
                                <span className="text-xs text-destructive flex items-center bg-destructive/10 px-2 py-1 rounded-full gap-1">
                                    <AlertCircle size={12} /> Send failed
                                </span>
                                <div className="bg-destructive/20 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm border border-destructive/20 opacity-80 break-words select-text">
                                    {fmsg.content || (fmsg.attachments?.length ? "[Attachment]" : "")}
                                </div>
                            </div>
                            <div className="flex gap-2 items-center text-xs mt-1 mr-1 text-muted-foreground">
                                <button onClick={() => onRetryMessage?.(fmsg.id)} className="flex items-center gap-1 hover:text-brand transition cursor-pointer">
                                    <RefreshCcw size={12} /> Retry
                                </button>
                                <span>•</span>
                                <button onClick={() => onRemoveFailedMessage?.(fmsg.id)} className="flex items-center gap-1 hover:text-destructive transition cursor-pointer">
                                    <Trash2 size={12} /> Delete
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
                        <DialogTitle>Recall message?</DialogTitle>
                        <DialogDescription>
                            The message will be recalled for everyone in the conversation. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setRecallConfirmId(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (recallConfirmId) onRecall(recallConfirmId);
                                setRecallConfirmId(null);
                            }}
                        >
                            Recall
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Delete message?</DialogTitle>
                        <DialogDescription>
                            The message will be deleted from your view. Others will still see it. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteConfirmId) onDelete(deleteConfirmId);
                                setDeleteConfirmId(null);
                            }}
                        >
                            Delete
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
                                title="Download"
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
