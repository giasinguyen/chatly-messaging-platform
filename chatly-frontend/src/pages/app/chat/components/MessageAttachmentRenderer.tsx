import { FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/message";

interface MessageAttachmentRendererProps {
    messageId: string;
    attachments: Attachment[];
    hasContent: boolean;
    isMe: boolean;
    onOpenImage: (attachmentId: string) => void;
}

export function MessageAttachmentRenderer({
    messageId,
    attachments,
    hasContent,
    isMe,
    onOpenImage,
}: MessageAttachmentRendererProps) {
    if (!attachments || attachments.length === 0) return null;

    return (
        <div className={cn("flex flex-col gap-2", hasContent ? "mt-2" : "")}>
            {attachments.map((att, i) => {
                const isImage = att.type?.startsWith("image/");
                if (isImage) {
                    const id = `${messageId}-${i}`;
                    return (
                        <button
                            type="button"
                            key={i}
                            onClick={() => onOpenImage(id)}
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
                        <span className="flex-1 truncate max-w-40">
                            {att.name ?? "File"}
                        </span>
                        <Download size={14} className="shrink-0 opacity-60" />
                    </a>
                );
            })}
        </div>
    );
}
