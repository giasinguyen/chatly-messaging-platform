import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Eye, Flag, Heart, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Reel } from "@/types/reel";
import { formatCount, formatPrivacy, getReactionCount, hasReacted } from "./reelFormat";

interface ReelSlideProps {
    reel: Reel;
    isActive: boolean;
    isBusy: boolean;
    onToggleLike: (reel: Reel) => void;
    onOpenComments: (reel: Reel) => void;
    onShare: (reel: Reel) => void;
    onOpenAuthorProfile: (reel: Reel) => void;
    onReport: (reel: Reel) => void;
}

export function ReelSlide({
    reel,
    isActive,
    isBusy,
    onToggleLike,
    onOpenComments,
    onShare,
    onOpenAuthorProfile,
    onReport,
}: ReelSlideProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const authorLabel = reel.authorDisplayName ?? reel.authorUsername ?? "Chatly user";
    const isLiked = hasReacted(reel);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isActive) {
            void video.play().catch(() => undefined);
            return;
        }
        video.pause();
    }, [isActive]);

    return (
        <section className="flex h-full w-full snap-center items-center justify-center bg-black px-4 py-5">
            <div className="relative h-full max-h-205 w-full max-w-115 overflow-hidden rounded-lg bg-zinc-950 shadow-2xl">
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    loop
                    playsInline
                    controls
                    muted
                    className="h-full w-full object-contain"
                />

                <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-4">
                    <ActionButton
                        label={formatCount(getReactionCount(reel))}
                        disabled={isBusy}
                        onClick={() => onToggleLike(reel)}
                    >
                        <Heart
                            className={cn(
                                "h-6 w-6",
                                isLiked && "fill-pink-500 text-pink-500",
                            )}
                        />
                    </ActionButton>
                    <ActionButton
                        label={formatCount(reel.commentCount)}
                        disabled={isBusy}
                        onClick={() => onOpenComments(reel)}
                    >
                        <MessageCircle className="h-6 w-6" />
                    </ActionButton>
                    <ActionButton
                        label={formatCount(reel.shareCount)}
                        disabled={isBusy}
                        onClick={() => onShare(reel)}
                    >
                        <Share2 className="h-6 w-6" />
                    </ActionButton>
                    <ActionButton label="Report" disabled={isBusy} onClick={() => onReport(reel)}>
                        <Flag className="h-6 w-6" />
                    </ActionButton>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-5 pr-20 text-white">
                    <button
                        type="button"
                        disabled={!reel.authorUsername}
                        onClick={() => onOpenAuthorProfile(reel)}
                        className="pointer-events-auto flex w-full items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <Avatar className="h-10 w-10 border border-white/30">
                            <AvatarImage src={reel.authorAvatarUrl} className="object-cover" />
                            <AvatarFallback className="bg-white/20 text-white">
                                {authorLabel.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{authorLabel}</p>
                            <p className="text-xs text-white/70">{formatPrivacy(reel.visibility)}</p>
                        </div>
                    </button>

                    {reel.caption && (
                        <p className="mt-3 line-clamp-3 text-sm leading-5 text-white/95">
                            {reel.caption}
                        </p>
                    )}

                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur">
                        <Eye className="h-3.5 w-3.5" />
                        {formatCount(reel.viewCount)} views
                    </div>
                </div>
            </div>
        </section>
    );
}

interface ActionButtonProps {
    children: ReactNode;
    label: string;
    disabled: boolean;
    onClick: () => void;
}

function ActionButton({ children, label, disabled, onClick }: ActionButtonProps) {
    return (
        <div className="flex flex-col items-center gap-1 text-white drop-shadow">
            <Button
                type="button"
                size="icon"
                disabled={disabled}
                onClick={onClick}
                className="rounded-full bg-black/35 text-white backdrop-blur hover:bg-white/20"
            >
                {children}
            </Button>
            <span className="text-xs font-semibold">{label}</span>
        </div>
    );
}
