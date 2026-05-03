import { Camera, Download, ExternalLink, MessageSquareShare } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
    const navigate = useNavigate();

    if (!attachments || attachments.length === 0) return null;

    return (
        <div className={cn("flex flex-col gap-2", hasContent ? "mt-2" : "")}>
            {attachments.map((att, i) => {
                const isPostPreview = att.kind === "POST_PREVIEW" || att.type === "application/x-chatly-post-preview";
                const isStoryReply = att.kind === "STORY_REPLY";

                if (isStoryReply) {
                    const isPhoto = att.storyType === "PHOTO" || att.storyType === "VIDEO";
                    return (
                        <div
                            key={i}
                            className={cn(
                                "w-full max-w-xs rounded-2xl overflow-hidden border",
                                isMe
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "border-border/60 bg-background/90 text-foreground",
                            )}
                        >
                            {/* Story preview area */}
                            {isPhoto && att.storyMediaUrl ? (
                                <div className="relative w-full h-36 bg-black">
                                    <img
                                        src={att.storyMediaUrl}
                                        alt="Story"
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/40" />
                                </div>
                            ) : (
                                <div className="w-full h-28 flex items-center justify-center bg-linear-to-br from-purple-500 to-pink-500 px-4">
                                    {att.storyContent ? (
                                        <p className="text-white text-sm font-medium text-center line-clamp-3">
                                            {att.storyContent}
                                        </p>
                                    ) : (
                                        <Camera className="h-8 w-8 text-white/70" />
                                    )}
                                </div>
                            )}
                            {/* Story label row */}
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-2",
                                isMe ? "bg-white/10" : "bg-muted/60",
                            )}>
                                {att.storyOwnerAvatarUrl ? (
                                    <img
                                        src={att.storyOwnerAvatarUrl}
                                        alt={att.storyOwnerName ?? "Story"}
                                        className="h-5 w-5 rounded-full object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-purple-400 to-pink-400 shrink-0">
                                        <Camera className="h-3 w-3 text-white" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className={cn(
                                        "text-[11px] truncate",
                                        isMe ? "text-white/80" : "text-muted-foreground",
                                    )}>
                                        {att.storyOwnerName ?? "Story"}
                                    </p>
                                </div>
                                <span className={cn(
                                    "text-[10px] uppercase tracking-wide shrink-0",
                                    isMe ? "text-white/50" : "text-muted-foreground",
                                )}>
                                    Story
                                </span>
                            </div>
                        </div>
                    );
                }
                if (isPostPreview) {
                    const targetUrl = att.targetUrl ?? (att.postId ? `/post/${att.postId}` : att.url);
                    const previewTitle = att.postTitle ?? att.name ?? "Shared post";
                    const previewText = att.postExcerpt ?? "Open this post to see the full content.";
                    return (
                        <button
                            type="button"
                            key={i}
                            onClick={() => navigate(targetUrl)}
                            className={cn(
                                "w-full max-w-sm rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                                isMe
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "border-border/60 bg-background/90 text-foreground",
                            )}
                        >
                            <div className="flex items-start gap-3">
                                {att.postImageUrl ? (
                                    <img
                                        src={att.postImageUrl}
                                        alt={previewTitle}
                                        className="h-20 w-20 rounded-xl object-cover shrink-0"
                                    />
                                ) : (
                                    <div className={cn(
                                        "flex h-20 w-20 items-center justify-center rounded-xl shrink-0",
                                        isMe ? "bg-white/10" : "bg-muted",
                                    )}>
                                        <MessageSquareShare className="h-5 w-5 opacity-70" />
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                                        <span>Shared post</span>
                                        <ExternalLink className="h-3 w-3" />
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-sm font-semibold">
                                        {previewTitle}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                        {previewText}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                        {att.postAuthorAvatarUrl ? (
                                            <img
                                                src={att.postAuthorAvatarUrl}
                                                alt={att.postAuthorName ?? "Author"}
                                                className="h-5 w-5 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                                                {(att.postAuthorName ?? "A").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="truncate">
                                            {att.postAuthorName ?? "Unknown author"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
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
