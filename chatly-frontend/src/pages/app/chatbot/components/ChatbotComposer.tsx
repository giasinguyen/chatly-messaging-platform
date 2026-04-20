import { useEffect, useState } from "react";
import {
    Paperclip,
    SendHorizontal,
    Globe,
    Cpu,
    Loader2,
    X,
    FileText,
    Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbotStore } from "@/store/chatbot.store";
import { McpPickerDialog } from "./McpPickerDialog";
import { cn } from "@/lib/utils";
import { agentFileService } from "@/services/agent-file.service";
import { toast } from "sonner";
import type { MessageAttachment } from "@/types/agent";

interface Props {
    sessionId: string;
    onSend: (content: string, attachments: MessageAttachment[]) => void;
    disabled?: boolean;
    isStreaming?: boolean;
    onCancel?: () => void;
}

interface PendingFile {
    localId: string;
    file: File;
    progress: number;
    done: boolean;
    fileId?: string;
    error?: string;
}

const ACCEPTED_TYPES =
    "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md";

export function ChatbotComposer({ sessionId, onSend, disabled, isStreaming, onCancel }: Props) {
    const {
        useWebSearch,
        setUseWebSearch,
        selectedMcpIds,
        draftsBySession,
        setDraft,
        draftAttachmentsBySession,
        setDraftAttachments,
    } = useChatbotStore();

    const draft = draftsBySession[sessionId] ?? "";
    const [mcpOpen, setMcpOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const isUploading = pendingFiles.some((p) => !p.done && !p.error);

    // Consume draft attachments stored by forward-to-AI flow
    useEffect(() => {
        const store = useChatbotStore.getState();
        const draftAtts = store.draftAttachmentsBySession[sessionId];
        if (!draftAtts?.length) return;
        // Clear immediately to prevent StrictMode double-fire duplicates
        store.setDraftAttachments(sessionId, []);
        const prefilled: PendingFile[] = draftAtts.map((att) => ({
            localId: `draft-${att.file_id}-${Date.now()}`,
            file: new File([], att.filename, { type: att.content_type }),
            progress: 100,
            done: true,
            fileId: att.file_id,
        }));
        setPendingFiles((prev) => [...prev, ...prefilled]);
    }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDraft(sessionId, e.target.value);

        // Auto-resize textarea
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === "Escape") {
            e.preventDefault();
            setDraft(sessionId, "");
            const textarea = document.getElementById("chatbot-composer-input") as HTMLTextAreaElement | null;
            if (textarea) textarea.style.height = "auto";
        }
    };

    const handleSend = () => {
        const text = draft.trim();
        if (!text || disabled || isUploading) return;
        const attachments: MessageAttachment[] = pendingFiles
            .filter((p) => p.done && p.fileId)
            .map((p) => ({
                file_id: p.fileId as string,
                filename: p.file.name,
                content_type: p.file.type || "application/octet-stream",
                size: p.file.size,
            }));
        onSend(text, attachments);
        setDraft(sessionId, "");
        setPendingFiles([]);
        // Reset textarea height
        const textarea = document.getElementById("chatbot-composer-input") as HTMLTextAreaElement | null;
        if (textarea) textarea.style.height = "auto";
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        processFiles(files);
        e.target.value = "";
    };

    const processFiles = async (files: File[]) => {
        for (const file of files) {
            const localId = `${Date.now()}-${Math.random()}`;
            const pending: PendingFile = { localId, file, progress: 0, done: false };
            setPendingFiles((prev) => [...prev, pending]);

            try {
                const uploaded = await agentFileService.upload(sessionId, file, (pct) => {
                    setPendingFiles((prev) =>
                        prev.map((p) =>
                            p.localId === localId ? { ...p, progress: pct } : p,
                        ),
                    );
                });
                setPendingFiles((prev) =>
                    prev.map((p) =>
                        p.localId === localId
                            ? { ...p, progress: 100, done: true, fileId: uploaded.id }
                            : p,
                    ),
                );
            } catch {
                setPendingFiles((prev) =>
                    prev.map((p) =>
                        p.localId === localId
                            ? { ...p, error: "Upload failed" }
                            : p,
                    ),
                );
                toast.error(`Upload ${file.name} failed`);
            }
        }
    };

    const removePending = (localId: string) => {
        setPendingFiles((prev) => prev.filter((p) => p.localId !== localId));
    };

    const canSend = draft.trim().length > 0 && !disabled && !isUploading;

    return (
        <div className="border-t border-border bg-background shrink-0">
            {/* Pending file chips */}
            {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3">
                    {pendingFiles.map((p) => (
                        <div
                            key={p.localId}
                            className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs max-w-45"
                        >
                            <FileText
                                size={18}
                                className="shrink-0 text-muted-foreground"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-foreground">
                                    {p.file.name}
                                </p>
                                {p.error ? (
                                    <p className="text-destructive">{p.error}</p>
                                ) : p.done ? (
                                    <p className="text-brand font-medium">Done</p>
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

            {/* Toolbar row */}
            <div className="flex items-center gap-1 px-4 pt-2">
                {/* File upload */}
                <label title="Upload document">
                    <input
                        type="file"
                        multiple
                        accept={ACCEPTED_TYPES}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <div className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer transition-colors">
                        <Paperclip className="h-4 w-4" />
                    </div>
                </label>

                {/* Web search toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 transition-colors",
                        useWebSearch
                            ? "text-brand bg-brand/10 hover:bg-brand/15"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setUseWebSearch(!useWebSearch)}
                    title={
                        useWebSearch
                            ? "Turn off web search"
                            : "Turn on web search"
                    }
                >
                    <Globe className="h-4 w-4" />
                </Button>

                {/* MCP picker */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 transition-colors",
                        selectedMcpIds.length > 0
                            ? "text-brand bg-brand/10 hover:bg-brand/15"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setMcpOpen(true)}
                    title="Choose MCP servers"
                >
                    <Cpu className="h-4 w-4" />
                </Button>

                {selectedMcpIds.length > 0 && (
                    <span className="text-[11px] text-brand font-medium">
                        {selectedMcpIds.length} MCP
                    </span>
                )}
            </div>

            {/* Input row */}
            <div className="flex items-end gap-3 p-4 pt-2">
                <textarea
                    id="chatbot-composer-input"
                    placeholder="Type a question for AI..."
                    value={draft}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="flex-1 resize-none bg-transparent border-none outline-none text-[15px] text-foreground placeholder:text-muted-foreground/50 min-h-10 max-h-40 py-2 leading-relaxed"
                />
                {isStreaming ? (
                    <Button
                        onClick={onCancel}
                        className="h-10 px-5 bg-muted-foreground text-white hover:bg-muted-foreground/80 transition-all active:scale-95 shrink-0"
                        title="Stop generating response"
                    >
                        <Square size={18} />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSend}
                        disabled={!canSend}
                        className="h-10 px-5 bg-brand text-white hover:bg-brand/90 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shrink-0"
                    >
                        {isUploading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <SendHorizontal size={18} />
                        )}
                    </Button>
                )}
            </div>

            {/* MCP Picker Dialog */}
            <McpPickerDialog open={mcpOpen} onOpenChange={setMcpOpen} />
        </div>
    );
}
