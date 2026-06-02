import {
    Download,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/message";
import {
    PostPreviewAttachment,
    ReelPreviewAttachment,
    StoryReplyAttachmentPreview,
} from "./MessagePreviewAttachment";
import { getFileTypeDisplay } from "./fileTypeDisplay";

function formatFileSize(size?: number): string {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

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
    const { t } = useTranslation();
    if (!attachments || attachments.length === 0) return null;

    return (
        <div className={cn("flex flex-col gap-2", hasContent ? "mt-2" : "")}>
            {attachments.map((att, i) => {
                const isPostPreview = att.kind === "POST_PREVIEW" || att.type === "application/x-chatly-post-preview" || Boolean(att.postId);
                const isReelPreview = att.kind === "REEL_PREVIEW" || att.type === "application/x-chatly-reel-preview" || Boolean(att.reelId);
                const isStoryReply = att.kind === "STORY_REPLY";

                if (isStoryReply) {
                    return <StoryReplyAttachmentPreview key={i} attachment={att} isMe={isMe} />;
                }
                if (isPostPreview) {
                    return <PostPreviewAttachment key={i} attachment={att} isMe={isMe} />;
                }
                if (isReelPreview) {
                    return <ReelPreviewAttachment key={i} attachment={att} isMe={isMe} />;
                }

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
                const isVideo = att.type?.startsWith("video/");
                if (isVideo) {
                    return (
                        <div
                            key={i}
                            className={cn(
                                "max-w-xs rounded-xl border p-1.5",
                                isMe
                                    ? "border-white/20 bg-black/10"
                                    : "border-border/60 bg-background/80",
                            )}
                        >
                            <video
                                src={att.url}
                                controls
                                className="rounded-xl max-w-full max-h-60 block"
                            />
                        </div>
                    );
                }
                const fileDisplay = getFileTypeDisplay(att.name, att.type);
                const FileIcon = fileDisplay.Icon;
                const handleDownload = () => {
                    const link = document.createElement("a");
                    link.href = att.url;
                    link.download = att.name ?? "file";
                    link.target = "_blank";
                    link.rel = "noreferrer";
                    link.click();
                };
                return (
                    <div
                        key={i}
                        className={cn(
                            "flex w-[23rem] max-w-full items-center gap-3 rounded-lg border-0 px-3 py-2.5 text-xs shadow-sm",
                            isMe ? "bg-blue-50 text-slate-800" : "bg-background text-foreground",
                        )}
                    >
                        <div className={cn("flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded text-white", fileDisplay.colorClass)}>
                            <FileIcon className="h-5 w-5" />
                            <span className="text-[9px] font-bold leading-none uppercase">{fileDisplay.extension}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-tight">
                                {att.name ?? t("chat.file_fallback")}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {formatFileSize(att.size)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title={t("cloud.download")}
                        >
                            <Download className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
