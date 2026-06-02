import { Camera, Clapperboard, ExternalLink, MessageSquareShare, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/message";

interface PreviewAttachmentProps {
    attachment: Attachment;
    isMe: boolean;
}

function previewShellClass(isMe: boolean) {
    return cn(
        "w-full max-w-sm rounded-2xl border p-4 text-left transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer select-none",
        isMe
            ? "border-[#4f46e5]/30 bg-[#312e81]/30 text-white dark:border-[#818cf8]/20 dark:bg-[#312e81]/40"
            : "border-slate-100 bg-[#f8fafc] text-[#1e293b] dark:border-[#272935] dark:bg-[#1f2029] dark:text-[#f8fafc]"
    );
}

export function StoryReplyAttachmentPreview({ attachment, isMe }: PreviewAttachmentProps) {
    const isPhoto = attachment.storyType === "PHOTO" || attachment.storyType === "VIDEO";

    return (
        <div
            className={cn(
                "w-full max-w-xs overflow-hidden rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-md",
                isMe
                    ? "border-[#4f46e5]/30 bg-[#312e81]/30 text-white dark:border-[#818cf8]/20 dark:bg-[#312e81]/40"
                    : "border-slate-100 bg-[#f8fafc] text-[#1e293b] dark:border-[#272935] dark:bg-[#1f2029] dark:text-[#f8fafc]"
            )}
        >
            {isPhoto && attachment.storyMediaUrl ? (
                <div className="relative h-44 w-full bg-slate-950">
                    <img
                        src={attachment.storyMediaUrl}
                        alt="Story"
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
            ) : (
                <div className="flex h-36 w-full flex-col items-center justify-center bg-gradient-to-br from-[#7c3aed] via-[#c084fc] to-[#e879f9] px-5 py-4">
                    {attachment.storyContent ? (
                        <p className="line-clamp-4 text-center text-sm font-semibold leading-relaxed text-white">
                            "{attachment.storyContent}"
                        </p>
                    ) : (
                        <Camera className="h-9 w-9 text-white/95 animate-pulse" />
                    )}
                </div>
            )}
            <div className={cn("flex items-center gap-2.5 px-3.5 py-3", isMe ? "bg-white/5" : "bg-slate-100/50 dark:bg-[#272935]/40")}>
                {attachment.storyOwnerAvatarUrl ? (
                    <img
                        src={attachment.storyOwnerAvatarUrl}
                        alt={attachment.storyOwnerName ?? "Story"}
                        className="h-6 w-6 shrink-0 rounded-full object-cover ring-2 ring-violet-500/20"
                    />
                ) : (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#e879f9]">
                        <Camera className="h-3 w-3 text-white" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold leading-none mb-0.5">
                        {attachment.storyOwnerName ?? "Story"}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none">Shared Story</p>
                </div>
            </div>
        </div>
    );
}

export function PostPreviewAttachment({ attachment, isMe }: PreviewAttachmentProps) {
    const navigate = useNavigate();
    const targetUrl = attachment.targetUrl ?? (attachment.postId ? `/post/${attachment.postId}` : attachment.url);
    const content = attachment.postExcerpt ?? attachment.postTitle ?? attachment.name ?? "Open this post to see the full content.";

    return (
        <button type="button" onClick={() => navigate(targetUrl)} className={previewShellClass(isMe)}>
            <div className="flex items-start gap-4">
                {attachment.postImageUrl ? (
                    <img
                        src={attachment.postImageUrl}
                        alt="Post preview"
                        className="h-20 w-20 shrink-0 rounded-xl object-cover border border-slate-250/20 dark:border-slate-800/20 shadow-sm"
                    />
                ) : (
                    <div className={cn("flex h-20 w-20 shrink-0 items-center justify-center rounded-xl", isMe ? "bg-white/10" : "bg-slate-200/50 dark:bg-[#2c2e3e]")}>
                        <MessageSquareShare className="h-6 w-6 text-violet-500 opacity-90" />
                    </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch">
                    <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                            <span>Shared post</span>
                            <ExternalLink className="h-3 w-3" />
                        </div>
                        <p className="mt-1.5 line-clamp-3 text-xs font-semibold leading-relaxed text-foreground/90 dark:text-white/90">
                            {content}
                        </p>
                    </div>
                    <AuthorRow
                        isMe={isMe}
                        avatarUrl={attachment.postAuthorAvatarUrl}
                        name={attachment.postAuthorName}
                    />
                </div>
            </div>
        </button>
    );
}

export function ReelPreviewAttachment({ attachment, isMe }: PreviewAttachmentProps) {
    const navigate = useNavigate();
    const targetUrl = attachment.targetUrl ?? (attachment.reelId ? `/reels?reelId=${attachment.reelId}` : "/reels");
    const caption = attachment.reelCaption ?? attachment.postTitle ?? attachment.name ?? "Shared reel";
    const videoUrl = attachment.reelVideoUrl ?? attachment.url;

    return (
        <button type="button" onClick={() => navigate(targetUrl)} className={previewShellClass(isMe)}>
            <div className="flex items-start gap-4">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-black shadow-sm">
                    {videoUrl ? (
                        <video
                            src={videoUrl}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Clapperboard className="h-5 w-5 opacity-70" />
                        </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-black shadow-md hover:scale-105 transition-transform duration-200">
                            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                        </span>
                    </div>
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch">
                    <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#ea580c]">
                            <span>Shared reel</span>
                            <ExternalLink className="h-3 w-3" />
                        </div>
                        <p className="mt-1 line-clamp-3 text-xs font-semibold leading-relaxed">{caption}</p>
                    </div>
                    <AuthorRow
                        isMe={isMe}
                        avatarUrl={attachment.reelAuthorAvatarUrl ?? attachment.postAuthorAvatarUrl}
                        name={attachment.reelAuthorName ?? attachment.postAuthorName}
                    />
                </div>
            </div>
        </button>
    );
}

function AuthorRow({
    isMe,
    avatarUrl,
    name,
}: {
    isMe: boolean;
    avatarUrl?: string;
    name?: string;
}) {
    const authorName = name ?? "Unknown author";

    return (
        <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {avatarUrl ? (
                <img src={avatarUrl} alt={authorName} className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200/20" />
            ) : (
                <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold", isMe ? "bg-white/20" : "bg-slate-200 dark:bg-[#2c2e3e]")}>
                    {authorName.charAt(0).toUpperCase()}
                </div>
            )}
            <span className="truncate">{authorName}</span>
        </div>
    );
}
