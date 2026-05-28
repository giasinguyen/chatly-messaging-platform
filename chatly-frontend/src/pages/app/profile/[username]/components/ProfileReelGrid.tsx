import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Loader2, MessageCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REEL_FEED_PAGE_SIZE } from "@/constants/reel";
import { reelService } from "@/services/reel.service";
import type { Reel } from "@/types/reel";

interface ProfileReelGridProps {
    authorId: string | null;
    isLimited: boolean;
    onNavigate: (id: string) => void;
}

function mergeReels(previous: Reel[], incoming: Reel[]) {
    const ids = new Set(previous.map((reel) => reel.id));
    return [...previous, ...incoming.filter((reel) => !ids.has(reel.id))];
}

function getReactionCount(reel: Reel) {
    return reel.reactions.reduce((total, reaction) => total + reaction.count, 0);
}

export function ProfileReelGrid({ authorId, isLimited, onNavigate }: ProfileReelGridProps) {
    const { t } = useTranslation();
    const [reels, setReels] = useState<Reel[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const isLoadingRef = useRef(false);

    const loadReels = useCallback(
        async (cursor: string | null = null) => {
            if (!authorId || isLimited || isLoadingRef.current) return;

            isLoadingRef.current = true;
            setIsLoading(true);
            try {
                const response = await reelService.getByAuthor(
                    authorId,
                    cursor,
                    REEL_FEED_PAGE_SIZE,
                );
                if (response.code !== 1000 || !response.result) {
                    toast.error(response.message ?? t("profile.reels_load_failed"));
                    return;
                }

                setReels((current) =>
                    cursor ? mergeReels(current, response.result.items) : response.result.items,
                );
                setNextCursor(response.result.nextCursor);
                setHasMore(response.result.hasMore);
            } catch {
                toast.error(t("profile.reels_load_failed"));
            } finally {
                isLoadingRef.current = false;
                setIsLoading(false);
            }
        },
        [authorId, isLimited, t],
    );

    useEffect(() => {
        setReels([]);
        setNextCursor(null);
        setHasMore(false);
        void loadReels(null);
    }, [loadReels]);

    if (isLimited) {
        return (
            <div className="py-10 text-center text-muted-foreground">
                {t("profile.reels_hidden")}
            </div>
        );
    }

    if (!isLoading && reels.length === 0) {
        return (
            <div className="py-10 text-center text-muted-foreground">
                {t("profile.no_reels_display")}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-1 md:gap-2">
                {reels.map((reel) => (
                    <button
                        key={reel.id}
                        type="button"
                        onClick={() => onNavigate(reel.id)}
                        className="group relative aspect-square overflow-hidden bg-muted"
                        title={reel.caption || "Open reel"}
                    >
                        <video
                            src={reel.videoUrl}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            muted
                            playsInline
                            preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/25" />
                        <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white">
                            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-linear-to-t from-black/65 via-black/20 to-transparent px-2 py-2 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <div className="flex items-center gap-3 text-xs font-semibold">
                                <span className="flex items-center gap-1">
                                    <Heart className="h-3.5 w-3.5 fill-white" />
                                    {getReactionCount(reel)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    {reel.commentCount}
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {isLoading && (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            )}

            {hasMore && !isLoading && nextCursor && (
                <div className="flex justify-center py-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadReels(nextCursor)}
                    >
                        Load more
                    </Button>
                </div>
            )}
        </div>
    );
}
