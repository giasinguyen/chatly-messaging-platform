import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle, lazy, Suspense } from "react";
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
    Clapperboard,
    Sticker,
} from "lucide-react";
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
import { useAuthStore } from "@/store/auth.store";
import type { Message, Attachment, Poll } from "@/types/message";

const LazyMediaPicker = lazy(() => import("@/components/media-picker/MediaPicker").then(m => ({ default: m.MediaPicker })));

interface ChatInputProps {
    conversationId?: string;
    replyingTo?: Message | null;
    senderName?: string;
    onCancelReply: () => void;
    onSendMessage: (content: string, attachments?: Attachment[], poll?: Poll, messageType?: string) => void;
    onTyping?: (typing: boolean) => void;
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
    replyingTo,
    senderName,
    onCancelReply,
    onSendMessage,
    onTyping,
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

        if (!isTyping && newVal.trim().length > 0) {
            setIsTyping(true);
            onTyping?.(true);
        }

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            stopTyping();
        }, TYPING_STOP_DELAY);
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
                        p.localId === localId ? { ...p, error: "Upload thất bại" } : p,
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

    const handleSend = () => {
        if (!canSend) return;

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        stopTyping();

        const attachments: Attachment[] = pendingFiles
            .filter((p) => p.uploaded)
            .map((p) => p.uploaded!);

        onSendMessage(content.trim(), attachments.length ? attachments : undefined);
        setContent("");
        setPendingFiles([]);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
        onSendMessage(displayUrl, [attachment], undefined, messageType);
        setActivePicker(null);
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
                            {senderName ?? "Bạn"}
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
                                    <p className="text-green-600 dark:text-green-400">Xong</p>
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

            <div className="p-4 px-6">
                <div className="flex items-center gap-3">
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
                        title="Gửi ảnh/video"
                    >
                        <ImagePlus size={18} />
                    </Button>

                    {/* File attach button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        title="Đính kèm file"
                    >
                        <Paperclip size={18} />
                    </Button>

                    {/* Emoji picker */}
                    <div className="relative" ref={emojiPickerRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                            title="Chọn emoji"
                        >
                            <Smile size={18} />
                        </Button>
                        {showEmojiPicker && (
                            <div className="absolute bottom-full mb-2 left-0 z-50">
                                <Picker
                                    data={data}
                                    onEmojiSelect={handleEmojiSelect}
                                    theme="auto"
                                    locale="vi"
                                    previewPosition="none"
                                    skinTonePosition="search"
                                    maxFrequentRows={2}
                                />
                            </div>
                        )}
                    </div>

                    {/* Poll creation button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPollDialog(true)}
                        title="Tạo bình chọn"
                    >
                        <BarChart3 size={18} />
                    </Button>

                    {/* GIF picker button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-9 w-9 shrink-0",
                            activePicker === "gif"
                                ? "text-brand bg-brand/10"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => { setActivePicker((p) => (p === "gif" ? null : "gif")); setShowEmojiPicker(false); }}
                        title="Gửi GIF"
                    >
                        <Clapperboard size={18} />
                    </Button>

                    {/* Sticker picker button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-9 w-9 shrink-0",
                            activePicker === "sticker"
                                ? "text-brand bg-brand/10"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => { setActivePicker((p) => (p === "sticker" ? null : "sticker")); setShowEmojiPicker(false); }}
                        title="Gửi Sticker"
                    >
                        <Sticker size={18} />
                    </Button>

                    <div className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            placeholder="Nhập tin nhắn tới người này"
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            className="bg-transparent border-transparent focus-visible:ring-0 focus-visible:border-transparent p-0 h-10 text-[15px] shadow-none placeholder:text-muted-foreground/50"
                        />
                    </div>
                    <div className="flex items-center gap-2">
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
                            <span className="font-medium text-sm">Gửi</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Poll creation dialog */}
            <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tạo bình chọn</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Câu hỏi</Label>
                            <Input
                                placeholder="Nhập câu hỏi bình chọn..."
                                value={pollQuestion}
                                onChange={(e) => setPollQuestion(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lựa chọn</Label>
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Input
                                        placeholder={`Lựa chọn ${idx + 1}`}
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
                                    <Plus size={14} /> Thêm lựa chọn
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
                            <Label htmlFor="poll-multiple">Cho phép chọn nhiều</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowPollDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSendPoll}
                            disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                        >
                            Gửi bình chọn
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
