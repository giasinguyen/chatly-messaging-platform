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
        "w-full max-w-sm rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
        isMe
            ? "border-white/20 bg-white/10 text-white"
            : "border-border/60 bg-background/90 text-foreground",
    );
}

export function StoryReplyAttachmentPreview({ attachment, isMe }: PreviewAttachmentProps) {
    const isPhoto = attachment.storyType === "PHOTO" || attachment.storyType === "VIDEO";

    return (
        <div
            className={cn(
                "w-full max-w-xs overflow-hidden rounded-2xl border",
                isMe
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-border/60 bg-background/90 text-foreground",
            )}
        >
            {isPhoto && attachment.storyMediaUrl ? (
                <div className="relative h-36 w-full bg-black">
                    <img
                        src={attachment.storyMediaUrl}
                        alt="Story"
                        className="h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/40" />
                </div>
            ) : (
                <div className="flex h-28 w-full items-center justify-center bg-linear-to-br from-purple-500 to-pink-500 px-4">
                    {attachment.storyContent ? (
                        <p className="line-clamp-3 text-center text-sm font-medium text-white">
                            {attachment.storyContent}
                        </p>
                    ) : (
                        <Camera className="h-8 w-8 text-white/70" />
                    )}
                </div>
            )}
            <div className={cn("flex items-center gap-2 px-3 py-2", isMe ? "bg-white/10" : "bg-muted/60")}>
                {attachment.storyOwnerAvatarUrl ? (
                    <img
                        src={attachment.storyOwnerAvatarUrl}
                        alt={attachment.storyOwnerName ?? "Story"}
                        className="h-5 w-5 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-400 to-pink-400">
                        <Camera className="h-3 w-3 text-white" />
                    </div>
                )}
                <p className={cn("min-w-0 flex-1 truncate text-[11px]", isMe ? "text-white/80" : "text-muted-foreground")}>
                    {attachment.storyOwnerName ?? "Story"}
                </p>
                <span className={cn("shrink-0 text-[10px] uppercase tracking-wide", isMe ? "text-white/50" : "text-muted-foreground")}>
                    Story
                </span>
            </div>
        </div>
    );
}

export function PostPreviewAttachment({ attachment, isMe }: PreviewAttachmentProps) {
    const navigate = useNavigate();
    const targetUrl = attachment.targetUrl ?? (attachment.postId ? `/post/${attachment.postId}` : attachment.url);
    const previewTitle = attachment.postTitle ?? attachment.name ?? "Shared post";
    const previewText = attachment.postExcerpt ?? "Open this post to see the full content.";

    return (
        <button type="button" onClick={() => navigate(targetUrl)} className={previewShellClass(isMe)}>
            <div className="flex items-start gap-3">
                {attachment.postImageUrl ? (
                    <img
                        src={attachment.postImageUrl}
                        alt={previewTitle}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />
                ) : (
                    <div className={cn("flex h-20 w-20 shrink-0 items-center justify-center rounded-xl", isMe ? "bg-white/10" : "bg-muted")}>
                        <MessageSquareShare className="h-5 w-5 opacity-70" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <span>Shared post</span>
                        <ExternalLink className="h-3 w-3" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">{previewTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{previewText}</p>
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
            <div className="flex items-start gap-3">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-black">
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-black">
                            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                        </span>
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <span>Shared reel</span>
                        <ExternalLink className="h-3 w-3" />
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm font-semibold">{caption}</p>
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
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {avatarUrl ? (
                <img src={avatarUrl} alt={authorName} className="h-5 w-5 rounded-full object-cover" />
            ) : (
                <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold", isMe ? "bg-white/10" : "bg-muted")}>
                    {authorName.charAt(0).toUpperCase()}
                </div>
            )}
            <span className="truncate">{authorName}</span>
        </div>
    );
}
