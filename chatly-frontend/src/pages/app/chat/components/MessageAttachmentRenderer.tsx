import { Download } from "lucide-react";
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
    if (t.includes("pdf") || ext === "pdf")
        return <FilePdf size={18} className="shrink-0" color="#ef4444" weight="duotone" />;
    if (
        t.includes("word") ||
        t.includes("document") ||
        ext === "docx" ||
        ext === "doc"
    )
        return (
            <MicrosoftWordLogo
                size={18}
                className="shrink-0"
                color="#2563eb"
                weight="duotone"
            />
        );
    if (
        t.includes("sheet") ||
        t.includes("excel") ||
        ext === "xlsx" ||
        ext === "xls"
    )
        return (
            <MicrosoftExcelLogo
                size={18}
                className="shrink-0"
                color="#16a34a"
                weight="duotone"
            />
        );
    if (ext === "csv")
        return <FileCsv size={18} className="shrink-0" color="#16a34a" weight="duotone" />;
    if (
        t.includes("presentation") ||
        t.includes("powerpoint") ||
        ext === "pptx" ||
        ext === "ppt"
    )
        return (
            <MicrosoftPowerpointLogo
                size={18}
                className="shrink-0"
                color="#ea580c"
                weight="duotone"
            />
        );
    if (t.startsWith("image/"))
        return (
            <PhosphorFileImage
                size={18}
                className="shrink-0"
                color="#7c3aed"
                weight="duotone"
            />
        );
    if (t.startsWith("video/"))
        return (
            <PhosphorFileVideo
                size={18}
                className="shrink-0"
                color="#db2777"
                weight="duotone"
            />
        );
    if (t.startsWith("audio/"))
        return (
            <PhosphorFileAudio
                size={18}
                className="shrink-0"
                color="#d97706"
                weight="duotone"
            />
        );
    if (
        t.includes("zip") ||
        t.includes("rar") ||
        t.includes("tar") ||
        t.includes("7z") ||
        ext === "zip" ||
        ext === "rar" ||
        ext === "7z"
    )
        return <FileZip size={18} className="shrink-0" color="#92400e" weight="duotone" />;
    if (
        t.includes("json") ||
        t.includes("xml") ||
        t.includes("javascript") ||
        t.includes("typescript") ||
        ["js", "ts", "jsx", "tsx", "json", "xml", "html", "css", "py", "java"].includes(ext)
    )
        return (
            <PhosphorFileCode
                size={18}
                className="shrink-0"
                color="#475569"
                weight="duotone"
            />
        );
    if (t.includes("text") || ext === "txt")
        return <PhosphorFile size={18} className="shrink-0" color="#94a3b8" weight="duotone" />;
    return <PhosphorFile size={18} className="shrink-0" weight="duotone" />;
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
                return (
                    <a
                        key={i}
                        href={att.url}
                        download={att.name}
                        className={cn(
                            "flex items-center gap-2 rounded-xl px-3 py-2 text-xs no-underline border transition-colors",
                            isMe
                                ? "border-white/20 bg-black/15 text-white hover:bg-black/25"
                                : "border-border/60 bg-background/80 text-foreground hover:bg-muted/70",
                        )}
                    >
                        {getFileIcon(att.type, att.name)}
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
