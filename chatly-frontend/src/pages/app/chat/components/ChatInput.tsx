import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle, lazy, Suspense, useMemo } from "react";
import type { KeyboardEvent } from "react";
import {
    SendHorizontal,
    X,
    CornerUpLeft,
    Paperclip,
    FileText,
    Loader2,
    Smile,
    ImagePlus,
    BarChart3,
    Plus,
    Trash2,
    Clock,
    MoreHorizontal,
    IdCard,
    Star,
    AlertTriangle,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { fileService } from "@/services/file.service";
import { getDisplayUrl, type KlipyItem } from "@/services/klipy.service";
import { groupService } from "@/services/group.service";
import { contactService } from "@/services/contact.service";
import { useAuthStore } from "@/store/auth.store";
import type { Message, Attachment, Poll, ChatUser } from "@/types/message";

const LazyMediaPicker = lazy(() => import("@/components/media-picker/MediaPicker").then(m => ({ default: m.MediaPicker })));

interface ChatInputProps {
    conversationId?: string;
    conversationType?: string;
    replyingTo?: Message | null;
    senderName?: string;
    onCancelReply: () => void;
    onSendMessage: (content: string, attachments?: Attachment[], poll?: Poll, mentions?: string[], priority?: string, messageType?: string) => void;
    onSendVCard?: (user: ChatUser) => void;
    onTyping?: (typing: boolean) => void;
    groupMembers?: ChatUser[];
    currentUserId?: string;
}

interface PendingFile {
    localId: string;
    file: File;
    previewUrl: string;
    progress: number;
    uploaded?: Attachment;
    error?: string;
}

export interface ChatInputRef {
    addFiles: (files: File[]) => void;
}

const TYPING_STOP_DELAY = 2000;
const ACCEPTED_TYPES =
    "image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip";

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({
    conversationId,
    conversationType,
    replyingTo,
    senderName,
    onCancelReply,
    onSendMessage,
    onSendVCard,
    onTyping,
    groupMembers = [],
    currentUserId,
}, ref) => {
    const { user } = useAuthStore();
    const [content, setContent] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showPollDialog, setShowPollDialog] = useState(false);
    const [activePicker, setActivePicker] = useState<"gif" | "sticker" | null>(null);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [pollMultipleChoice, setPollMultipleChoice] = useState(false);
    const [showReminderDialog, setShowReminderDialog] = useState(false);
    const [reminderTitle, setReminderTitle] = useState("");
    const [reminderDescription, setReminderDescription] = useState("");
    const [reminderDate, setReminderDate] = useState("");
    const [reminderTime, setReminderTime] = useState("");
    const [reminderSubmitting, setReminderSubmitting] = useState(false);
    // Mention autocomplete state
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const mentionListRef = useRef<HTMLDivElement>(null);
    // Priority menu state
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
    const priorityMenuRef = useRef<HTMLDivElement>(null);
    // VCard dialog state
    const [showVCardDialog, setShowVCardDialog] = useState(false);
    const [vCardUser, setVCardUser] = useState<ChatUser | null>(null);
    const [vCardContacts, setVCardContacts] = useState<ChatUser[]>([]);
    const [vCardLoading, setVCardLoading] = useState(false);
    const typingTimerRef = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // ----------------------------------------------------------------
    // Typing Logic
    // ----------------------------------------------------------------
    const stopTyping = useCallback(() => {
        if (isTyping) {
            setIsTyping(false);
            onTyping?.(false);
        }
    }, [isTyping, onTyping]);

    const handleContentChange = (newVal: string) => {
        setContent(newVal);

        // Detect @mention trigger
        const cursorPos = inputRef.current?.selectionStart ?? newVal.length;
        const textBeforeCursor = newVal.slice(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
        if (mentionMatch) {
            setMentionQuery(mentionMatch[1]);
            setMentionIndex(0);
        } else {
            setMentionQuery(null);
        }

        if (!isTyping && newVal.trim().length > 0) {
            setIsTyping(true);
            onTyping?.(true);
        }

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            stopTyping();
        }, TYPING_STOP_DELAY);
    };

    // Filtered mention suggestions
    const mentionSuggestions = useMemo(() => {
        if (mentionQuery === null) return [];
        const q = mentionQuery.toLowerCase();
        const results: { id: string; displayName: string; username: string }[] = [];
        // Always show @all option first
        if ("all".startsWith(q)) {
            results.push({ id: "all", displayName: "All members", username: "all" });
        }
        for (const m of groupMembers) {
            if (m.id === currentUserId) continue; // don't suggest self
            if (
                m.displayName.toLowerCase().includes(q) ||
                m.username.toLowerCase().includes(q)
            ) {
                results.push(m);
            }
            if (results.length >= 8) break;
        }
        return results;
    }, [mentionQuery, groupMembers, currentUserId]);

    const insertMention = (user: { id: string; displayName: string; username: string }) => {
        const cursorPos = inputRef.current?.selectionStart ?? content.length;
        const textBeforeCursor = content.slice(0, cursorPos);
        const textAfterCursor = content.slice(cursorPos);
        const mentionStart = textBeforeCursor.lastIndexOf("@");
        const insertName = user.id === "all" ? "@all" : `@${user.displayName}`;
        const newContent = textBeforeCursor.slice(0, mentionStart) + insertName + " " + textAfterCursor;
        setContent(newContent);
        setMentionQuery(null);
        inputRef.current?.focus();
    };

    useEffect(() => {
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    // Close emoji picker on outside click
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handler = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showEmojiPicker]);

    // Close priority menu on outside click
    useEffect(() => {
        if (!showPriorityMenu) return;
        const handler = (e: MouseEvent) => {
            if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) {
                setShowPriorityMenu(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showPriorityMenu]);

    const handleEmojiSelect = (emoji: { native: string }) => {
        setContent((prev) => prev + emoji.native);
        inputRef.current?.focus();
    };

    // ----------------------------------------------------------------
    // File Upload Logic
    // ----------------------------------------------------------------
    const processFiles = async (files: File[]) => {
        if (!files.length) return;

        for (const file of files) {
            const localId = `${Date.now()}-${Math.random()}`;
            const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";

            const pending: PendingFile = { localId, file, previewUrl, progress: 0 };
            setPendingFiles((prev) => [...prev, pending]);

            try {
                const result = await fileService.upload(file, conversationId, (pct) => {
                    setPendingFiles((prev) =>
                        prev.map((p) => (p.localId === localId ? { ...p, progress: pct } : p)),
                    );
                });

                const attachment: Attachment = {
                    fileId: result.fileId,
                    url: result.url,
                    name: result.fileName,
                    type: result.fileType,
                    size: result.fileSize,
                };

                setPendingFiles((prev) =>
                    prev.map((p) =>
                        p.localId === localId ? { ...p, progress: 100, uploaded: attachment } : p,
                    ),
                );
            } catch {
                setPendingFiles((prev) =>
                    prev.map((p) =>
                        p.localId === localId ? { ...p, error: "Upload failed" } : p,
                    ),
                );
            }
        }
    };

    useImperativeHandle(ref, () => ({
        addFiles: (files: File[]) => processFiles(files),
    }));

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        processFiles(files);
        e.target.value = "";
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const items = Array.from(e.clipboardData.items);
        const files: File[] = [];
        for (const item of items) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) {
                    const isAccepted = ACCEPTED_TYPES.split(",").some(type => {
                        const cleanType = type.trim();
                        if (cleanType.endsWith("/*")) return file.type.startsWith(cleanType.replace("/*", ""));
                        if (cleanType.startsWith(".")) return file.name.endsWith(cleanType);
                        return file.type === cleanType;
                    }) || file.type.startsWith("image/");
                    
                    if (isAccepted) files.push(file);
                }
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            processFiles(files);
        }
    };

    const removePending = (localId: string) => {
        setPendingFiles((prev) => {
            const item = prev.find((p) => p.localId === localId);
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((p) => p.localId !== localId);
        });
    };

    // ----------------------------------------------------------------
    // Send Logic
    // ----------------------------------------------------------------
    const isUploading = pendingFiles.some((p) => !p.uploaded && !p.error);
    const canSend = (content.trim().length > 0 || pendingFiles.some((p) => p.uploaded)) && !isUploading;

    // Extract mention user IDs from the content text
    const extractMentions = (text: string): string[] => {
        const mentionIds: string[] = [];
        // Build sorted names (longest first) so multi-word display names match before partial ones
        const names = [
            ...groupMembers.flatMap((m) => [m.displayName, m.username]),
            "all",
        ].filter(Boolean).sort((a, b) => b.length - a.length);
        const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const mentionRegex = new RegExp(`@(${escaped.join('|')})`, 'g');
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
            const name = match[1];
            if (name === "all") {
                mentionIds.push("all");
            } else {
                // Find user by displayName
                const user = groupMembers.find(
                    (m) => m.displayName === name || m.username === name,
                );
                if (user) mentionIds.push(user.id);
            }
        }
        return [...new Set(mentionIds)];
    };

    const handleSend = () => {
        if (!canSend) return;

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        stopTyping();

        const attachments: Attachment[] = pendingFiles
            .filter((p) => p.uploaded)
            .map((p) => p.uploaded!);

        const mentions = extractMentions(content);
        onSendMessage(content.trim(), attachments.length ? attachments : undefined, undefined, mentions.length ? mentions : undefined, selectedPriority ?? undefined);
        setContent("");
        setMentionQuery(null);
        setPendingFiles([]);
        setSelectedPriority(null);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Handle mention autocomplete navigation
        if (mentionQuery !== null && mentionSuggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(mentionSuggestions[mentionIndex]);
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setMentionQuery(null);
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSendPoll = () => {
        const trimmedQuestion = pollQuestion.trim();
        const validOptions = pollOptions.map(o => o.trim()).filter(Boolean);
        if (!trimmedQuestion || validOptions.length < 2) return;
        onSendMessage(trimmedQuestion, undefined, {
            question: trimmedQuestion,
            options: validOptions,
            multipleChoice: pollMultipleChoice,
            votes: {},
        });
        setShowPollDialog(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
        setPollMultipleChoice(false);
    };

    const handleMediaSelect = (item: KlipyItem) => {
        const displayUrl = getDisplayUrl(item);
        const messageType = item.type === "sticker" ? "STICKER" : "GIF";
        const attachment: Attachment = {
            fileId: item.slug,
            url: displayUrl,
            name: item.title,
            type: item.type === "sticker" ? "image/gif" : "image/webp",
        };
        onSendMessage(displayUrl, [attachment], undefined, undefined, undefined, messageType);
        setActivePicker(null);
    };

    const handleCreateReminder = async () => {
        if (!conversationId || !reminderTitle.trim()) return;
        setReminderSubmitting(true);
        try {
            let remindAt: string | undefined;
            if (reminderDate && reminderTime) {
                remindAt = new Date(`${reminderDate}T${reminderTime}:00`).toISOString();
            } else if (reminderDate) {
                remindAt = new Date(`${reminderDate}T00:00:00`).toISOString();
            }
            await groupService.createReminder(conversationId, {
                title: reminderTitle.trim(),
                description: reminderDescription.trim() || undefined,
                remindAt,
            });
            toast.success("Reminder created");
            setShowReminderDialog(false);
            setReminderTitle("");
            setReminderDescription("");
            setReminderDate("");
            setReminderTime("");
        } catch {
            toast.error("Could not create reminder");
        } finally {
            setReminderSubmitting(false);
        }
    };

    return (
        <div className="border-t border-border bg-background font-inter relative">
            {/* MediaPicker overlay */}
            {activePicker && user?.id && (
                <Suspense fallback={
                    <div className="absolute bottom-14.5 left-0 right-0 h-97.5 bg-background border-t border-border flex items-center justify-center z-20">
                        <Loader2 size={24} className="animate-spin text-brand" />
                    </div>
                }>
                    <LazyMediaPicker
                        initialTab={activePicker}
                        customerId={user.id}
                        onSelect={handleMediaSelect}
                        onClose={() => setActivePicker(null)}
                    />
                </Suspense>
            )}
            {/* Reply preview bar */}
            {replyingTo && (
                <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5 bg-muted/30 border-b border-border/50">
                    <CornerUpLeft size={14} className="text-brand shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-brand">
                            {senderName ?? "You"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                            {replyingTo.content}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={onCancelReply}
                    >
                        <X size={12} />
                    </Button>
                </div>
            )}

            {/* Attachment previews */}
            {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-6 pt-3">
                    {pendingFiles.map((p) => (
                        <div
                            key={p.localId}
                            className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs max-w-45"
                        >
                            {p.previewUrl ? (
                                <img
                                    src={p.previewUrl}
                                    alt={p.file.name}
                                    className="h-10 w-10 rounded object-cover shrink-0"
                                />
                            ) : (
                                <FileText size={24} className="shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-foreground">{p.file.name}</p>
                                {p.error ? (
                                    <p className="text-destructive">{p.error}</p>
                                ) : p.uploaded ? (
                                    <p className="text-green-600 dark:text-green-400">Done</p>
                                ) : (
                                    <div className="mt-1 h-1 w-full rounded-full bg-muted-foreground/20">
                                        <div
                                            className="h-1 rounded-full bg-brand transition-all"
                                            style={{ width: `${p.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground text-background"
                                onClick={() => removePending(p.localId)}
                                aria-label="Remove"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="px-6 pt-3 pb-4 space-y-2">
                {/* Row 1: Toolbar */}
                <div className="flex items-center gap-1">
                    {/* Hidden file inputs */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,audio/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {/* Image/Video attach button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => imageInputRef.current?.click()}
                        title="Send image/video"
                    >
                        <ImagePlus size={18} />
                    </Button>

                    {/* File attach button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach file"
                    >
                        <Paperclip size={18} />
                    </Button>

                    {/* Combined Emoji / GIF / Sticker button */}
                    <div className="relative" ref={emojiPickerRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-9 w-9 shrink-0",
                                (showEmojiPicker || activePicker) ? "text-brand bg-brand/10" : "text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => {
                                if (activePicker) {
                                    setActivePicker(null);
                                } else {
                                    setShowEmojiPicker((prev) => !prev);
                                }
                            }}
                            title="Emoji / GIF / Sticker"
                        >
                            <Smile size={18} />
                        </Button>
                        {showEmojiPicker && (
                            <div className="absolute bottom-full mb-2 left-0 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                                <div className="flex items-center border-b border-border bg-muted/30">
                                    <span className="px-3 py-1.5 text-xs font-semibold text-brand border-b-2 border-brand">
                                        😀 Emoji
                                    </span>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        onMouseDown={(e) => { e.preventDefault(); setShowEmojiPicker(false); setActivePicker("gif"); }}
                                    >
                                        GIF
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        onMouseDown={(e) => { e.preventDefault(); setShowEmojiPicker(false); setActivePicker("sticker"); }}
                                    >
                                        Sticker
                                    </button>
                                </div>
                                <Picker
                                    data={data}
                                    onEmojiSelect={handleEmojiSelect}
                                    theme="auto"
                                    locale="en"
                                    previewPosition="none"
                                    skinTonePosition="search"
                                    maxFrequentRows={2}
                                />
                            </div>
                        )}
                    </div>

                    {/* More menu: priority + poll + reminder + VCard */}
                    <div className="relative" ref={priorityMenuRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-9 w-9 shrink-0 transition-colors",
                                selectedPriority === "IMPORTANT" && "text-amber-500 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40",
                                selectedPriority === "URGENT" && "text-red-500 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40",
                                !selectedPriority && "text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => setShowPriorityMenu((prev) => !prev)}
                            title="More options"
                        >
                            <MoreHorizontal size={18} />
                        </Button>
                        {showPriorityMenu && (
                            <div className="absolute bottom-full mb-2 left-full ml-2 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[220px] py-1">
                                <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Độ ưu tiên</p>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors",
                                        selectedPriority === "IMPORTANT" && "text-amber-500",
                                    )}
                                    onClick={() => {
                                        setSelectedPriority((prev) => (prev === "IMPORTANT" ? null : "IMPORTANT"));
                                        setShowPriorityMenu(false);
                                    }}
                                >
                                    <Star size={15} className="text-amber-500 shrink-0" />
                                    Đánh dấu tin quan trọng
                                    {selectedPriority === "IMPORTANT" && <Check size={13} className="ml-auto" />}
                                </button>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors",
                                        selectedPriority === "URGENT" && "text-red-500",
                                    )}
                                    onClick={() => {
                                        setSelectedPriority((prev) => (prev === "URGENT" ? null : "URGENT"));
                                        setShowPriorityMenu(false);
                                    }}
                                >
                                    <AlertTriangle size={15} className="text-red-500 shrink-0" />
                                    Đánh dấu tin khẩn cấp
                                    {selectedPriority === "URGENT" && <Check size={13} className="ml-auto" />}
                                </button>
                                <div className="h-px bg-border mx-2 my-1" />
                                <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Thêm vào tin nhắn</p>
                                {conversationType !== "PRIVATE" && (
                                    <button
                                        type="button"
                                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
                                        onClick={() => { setShowPriorityMenu(false); setShowPollDialog(true); }}
                                    >
                                        <BarChart3 size={15} className="text-brand shrink-0" />
                                        Tạo cuộc bình chọn
                                    </button>
                                )}
                                {conversationType !== "PRIVATE" && (
                                    <button
                                        type="button"
                                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
                                        onClick={() => { setShowPriorityMenu(false); setShowReminderDialog(true); }}
                                    >
                                        <Clock size={15} className="text-muted-foreground shrink-0" />
                                        Tạo nhắc nhở
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
                                    onClick={async () => {
                                        setShowPriorityMenu(false);
                                        setVCardUser(null);
                                        setShowVCardDialog(true);
                                        setVCardLoading(true);
                                        try {
                                            const res = await contactService.getByStatus('ACCEPTED');
                                            const friends: ChatUser[] = (res.result ?? []).map((c) => {
                                                const friend = c.user.id === currentUserId ? c.contact : c.user;
                                                return { id: friend.id, username: friend.username, displayName: friend.displayName, avatarUrl: friend.avatarUrl ?? '' };
                                            });
                                            const me = groupMembers.find((m) => m.id === currentUserId);
                                            if (me && !friends.some((f) => f.id === me.id)) friends.unshift(me);
                                            setVCardContacts(friends);
                                        } catch { setVCardContacts(groupMembers); }
                                        finally { setVCardLoading(false); }
                                    }}
                                >
                                    <IdCard size={15} className="text-muted-foreground shrink-0" />
                                    Gửi danh thiếp
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Text input + send */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        {/* Mention autocomplete dropdown */}
                        {mentionQuery !== null && mentionSuggestions.length > 0 && (
                            <div
                                ref={mentionListRef}
                                className="absolute bottom-full left-0 mb-1 w-72 max-h-52 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50"
                            >
                                {mentionSuggestions.map((user, idx) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className={cn(
                                            "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                                            idx === mentionIndex && "bg-accent",
                                        )}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            insertMention(user);
                                        }}
                                    >
                                        <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-xs font-semibold text-brand shrink-0">
                                            {user.id === "all" ? "@" : user.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{user.displayName}</p>
                                            {user.id !== "all" && (
                                                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <Input
                            ref={inputRef}
                            placeholder="Type a message. Use @ to mention"
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            className="bg-transparent border-transparent focus-visible:ring-0 focus-visible:border-transparent p-0 h-10 text-[15px] shadow-none placeholder:text-muted-foreground/50"
                        />
                    </div>
                    <Button
                        onClick={handleSend}
                        disabled={!canSend}
                        className="h-10 px-6 bg-brand text-white hover:bg-brand/90 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {isUploading ? (
                            <Loader2 size={18} className="mr-2 animate-spin" />
                        ) : (
                            <SendHorizontal size={18} className="mr-2" />
                        )}
                        <span className="font-medium text-sm">Send</span>
                    </Button>
                </div>
            </div>

            {/* Poll creation dialog */}
            <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create poll</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Question</Label>
                            <Input
                                placeholder="Enter poll question..."
                                value={pollQuestion}
                                onChange={(e) => setPollQuestion(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Options</Label>
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Input
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const next = [...pollOptions];
                                            next[idx] = e.target.value;
                                            setPollOptions(next);
                                        }}
                                    />
                                    {pollOptions.length > 2 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {pollOptions.length < 10 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-1"
                                    onClick={() => setPollOptions([...pollOptions, ""])}
                                >
                                    <Plus size={14} /> Add option
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="poll-multiple"
                                checked={pollMultipleChoice}
                                onChange={(e) => setPollMultipleChoice(e.target.checked)}
                                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                            />
                            <Label htmlFor="poll-multiple">Allow multiple choice</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowPollDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendPoll}
                            disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                        >
                            Send poll
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reminder creation dialog */}
            <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create reminder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Title <span className="text-destructive">*</span></Label>
                            <Input
                                placeholder="Reminder title..."
                                value={reminderTitle}
                                onChange={(e) => setReminderTitle(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Description (optional)</Label>
                            <Input
                                placeholder="Add a description..."
                                value={reminderDescription}
                                onChange={(e) => setReminderDescription(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={reminderDate}
                                    onChange={(e) => setReminderDate(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Time</Label>
                                <Input
                                    type="time"
                                    value={reminderTime}
                                    onChange={(e) => setReminderTime(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowReminderDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateReminder}
                            disabled={!reminderTitle.trim() || reminderSubmitting}
                        >
                            {reminderSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
                            Create reminder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Business card (VCard) dialog */}
            <Dialog open={showVCardDialog} onOpenChange={setShowVCardDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Send contact card</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                        {vCardLoading && <p className="text-center text-sm text-muted-foreground py-4">Loading contacts...</p>}
                        {!vCardLoading && vCardContacts.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No contacts found</p>}
                        {vCardContacts.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                className={cn(
                                    "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors border",
                                    vCardUser?.id === user.id ? "border-brand bg-brand/5" : "border-transparent",
                                )}
                                onClick={() => setVCardUser(user)}
                            >
                                <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-sm font-semibold text-brand shrink-0">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                        user.displayName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate">
                                        {user.displayName}
                                        {user.id === currentUserId && (
                                            <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                </div>
                                {vCardUser?.id === user.id && <Check size={15} className="text-brand shrink-0" />}
                            </button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowVCardDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={!vCardUser}
                            onClick={() => {
                                if (vCardUser) {
                                    onSendVCard?.(vCardUser);
                                    setShowVCardDialog(false);
                                    setVCardUser(null);
                                }
                            }}
                        >
                            Send card
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
