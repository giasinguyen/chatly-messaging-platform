import {
    Archive,
    CheckCircle2,
    Code2,
    Download,
    File,
    FileAudio,
    FileImage,
    FileSpreadsheet,
    FileText,
    FileVideo,
    FolderOpen,
    Presentation,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/message";
import {
    PostPreviewAttachment,
    ReelPreviewAttachment,
    StoryReplyAttachmentPreview,
} from "./MessagePreviewAttachment";

function getFileIcon(mimeType?: string, fileName?: string) {
    const t = mimeType?.toLowerCase() ?? "";
    const ext = (fileName?.split(".").pop() ?? "").toLowerCase();
    const iconClassName = "h-5 w-5";
    if (t.includes("pdf") || ext === "pdf")
        return { icon: <FileText className={iconClassName} />, className: "bg-red-500", label: "PDF" };
    if (
        t.includes("word") ||
        t.includes("document") ||
        ext === "docx" ||
        ext === "doc"
    )
        return { icon: <FileText className={iconClassName} />, className: "bg-blue-600", label: "DOC" };
    if (
        t.includes("sheet") ||
        t.includes("excel") ||
        ext === "xlsx" ||
        ext === "xls"
    )
        return { icon: <FileSpreadsheet className={iconClassName} />, className: "bg-green-600", label: "XLS" };
    if (ext === "csv")
        return { icon: <FileSpreadsheet className={iconClassName} />, className: "bg-emerald-600", label: "CSV" };
    if (
        t.includes("presentation") ||
        t.includes("powerpoint") ||
        ext === "pptx" ||
        ext === "ppt"
    )
        return { icon: <Presentation className={iconClassName} />, className: "bg-orange-500", label: "PPT" };
    if (t.startsWith("image/"))
        return { icon: <FileImage className={iconClassName} />, className: "bg-violet-600", label: "IMG" };
    if (t.startsWith("video/"))
        return { icon: <FileVideo className={iconClassName} />, className: "bg-pink-600", label: "VID" };
    if (t.startsWith("audio/"))
        return { icon: <FileAudio className={iconClassName} />, className: "bg-amber-600", label: "AUD" };
    if (
        t.includes("zip") ||
        t.includes("rar") ||
        t.includes("tar") ||
        t.includes("7z") ||
        ext === "zip" ||
        ext === "rar" ||
        ext === "7z"
    )
        return { icon: <Archive className={iconClassName} />, className: "bg-yellow-600", label: "ZIP" };
    if (
        t.includes("json") ||
        t.includes("xml") ||
        t.includes("javascript") ||
        t.includes("typescript") ||
        ["js", "ts", "jsx", "tsx", "json", "xml", "html", "css", "py", "java"].includes(ext)
    )
        return { icon: <Code2 className={iconClassName} />, className: "bg-slate-600", label: "CODE" };
    if (t.includes("text") || ext === "txt")
        return { icon: <File className={iconClassName} />, className: "bg-slate-500", label: "TXT" };
    return { icon: <File className={iconClassName} />, className: "bg-slate-500", label: ext ? ext.slice(0, 4).toUpperCase() : "FILE" };
}

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
                const fileIcon = getFileIcon(att.type, att.name);
                const handleOpen = () => window.open(att.url, "_blank", "noopener,noreferrer");
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
                            "flex w-[23rem] max-w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-xs shadow-sm",
                            isMe
                                ? "border-blue-400 bg-blue-50 text-slate-800"
                                : "border-border/70 bg-background text-foreground",
                        )}
                    >
                        <div className={cn("flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded text-white", fileIcon.className)}>
                            {fileIcon.icon}
                            <span className="text-[9px] font-bold leading-none">{fileIcon.label}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-tight">
                                {att.name ?? t("chat.file_fallback")}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                {formatFileSize(att.size)}
                                {att.size ? <span>•</span> : null}
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{t("chat.file_on_cloud")}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpen}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title={t("common.open")}
                        >
                            <FolderOpen className="h-4 w-4" />
                        </button>
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
