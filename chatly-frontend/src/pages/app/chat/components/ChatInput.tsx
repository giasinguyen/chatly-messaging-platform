import { useState, useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import {
    SendHorizontal,
    X,
    CornerUpLeft,
    Paperclip,
    FileText,
    Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fileService } from "@/services/file.service";
import type { Message, Attachment } from "@/types/message";

interface ChatInputProps {
    conversationId?: string;
    replyingTo?: Message | null;
    senderName?: string;
    onCancelReply: () => void;
    onSendMessage: (content: string, attachments?: Attachment[]) => void;
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

const TYPING_STOP_DELAY = 2000;
const ACCEPTED_TYPES =
    "image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip";

export function ChatInput({
    conversationId,
    replyingTo,
    senderName,
    onCancelReply,
    onSendMessage,
    onTyping,
}: ChatInputProps) {
    const [content, setContent] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const typingTimerRef = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // ----------------------------------------------------------------
    // File Upload Logic
    // ----------------------------------------------------------------
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;

        // Reset input so the same file can be re-selected
        e.target.value = "";

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

    return (
        <div className="border-t border-border bg-background font-inter">
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
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPTED_TYPES}
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {/* Attach button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        title="Đính kèm file"
                    >
                        <Paperclip size={18} />
                    </Button>

                    <div className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            placeholder="Nhập tin nhắn tới người này"
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            onKeyDown={handleKeyDown}
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
        </div>
    );
}

