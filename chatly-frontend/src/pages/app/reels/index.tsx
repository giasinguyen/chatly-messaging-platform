import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clapperboard, Loader2, Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreateReelModal } from "@/components/app/CreateReelModal";
import { REEL_FEED_PAGE_SIZE } from "@/constants/reel";
import { reelService } from "@/services/reel.service";
import { useAuthStore } from "@/store/auth.store";
import type { Reel } from "@/types/reel";
import type { ReportPostRequest } from "@/types/post";
import { ReportPostDialog } from "@/features/social/components/ReportPostDialog";
import { ReelSlide } from "./components/ReelSlide";
import { ReelCommentsDialog } from "./components/ReelCommentsDialog";
import { ShareReelDialog } from "./components/ShareReelDialog";

function mergeReels(existing: Reel[], incoming: Reel[]) {
    const existingIds = new Set(existing.map((reel) => reel.id));
    return [...existing, ...incoming.filter((reel) => !existingIds.has(reel.id))];
}

export default function ReelsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const user = useAuthStore((s) => s.user);
    const [reels, setReels] = useState<Reel[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedCommentsReel, setSelectedCommentsReel] = useState<Reel | null>(null);
    const [selectedShareReel, setSelectedShareReel] = useState<Reel | null>(null);
    const [selectedReportReel, setSelectedReportReel] = useState<Reel | null>(null);
    const [busyReelId, setBusyReelId] = useState<string | null>(null);
    const [isReportingReel, setIsReportingReel] = useState(false);
    const viewedIdsRef = useRef<Set<string>>(new Set());

    const focusedReelId = searchParams.get("reelId");
    const activeReel = reels[activeIndex];
    const isEmpty = !isLoading && reels.length === 0;

    const updateReel = useCallback((updatedReel: Reel) => {
        setReels((current) =>
            current.map((reel) => (reel.id === updatedReel.id ? updatedReel : reel)),
        );
        setSelectedCommentsReel((current) =>
            current?.id === updatedReel.id ? updatedReel : current,
        );
    }, []);

    const incrementCommentCount = useCallback((reelId: string) => {
        setReels((current) =>
            current.map((reel) =>
                reel.id === reelId
                    ? { ...reel, commentCount: reel.commentCount + 1 }
                    : reel,
            ),
        );
        setSelectedCommentsReel((current) =>
            current?.id === reelId
                ? { ...current, commentCount: current.commentCount + 1 }
                : current,
        );
    }, []);

    const loadReels = useCallback(
        async (cursor: string | null, shouldReplace = false) => {
            setIsLoading(true);
            try {
                const response = await reelService.getFeed(cursor, REEL_FEED_PAGE_SIZE);
                if (response.code !== 1000 || !response.result) {
                    toast.error(response.message ?? "Could not load reels.");
                    return;
                }

                setReels((current) =>
                    shouldReplace
                        ? response.result.items
                        : mergeReels(current, response.result.items),
                );
                setNextCursor(response.result.nextCursor);
                setHasMore(response.result.hasMore);
                if (shouldReplace) {
                    setActiveIndex(0);
                    viewedIdsRef.current = new Set();
                }
            } catch {
                toast.error("Could not load reels.");
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        if (!focusedReelId) {
            void loadReels(null, true);
            return;
        }

        let isActive = true;
        setIsLoading(true);
        Promise.all([
            reelService.getById(focusedReelId),
            reelService.getFeed(null, REEL_FEED_PAGE_SIZE),
        ])
            .then(([focusedResponse, feedResponse]) => {
                if (!isActive) return;
                if (focusedResponse.code !== 1000 || !focusedResponse.result) {
                    toast.error(focusedResponse.message ?? "Could not load reel.");
                    return;
                }
                const feed = feedResponse.result;
                setReels(mergeReels([focusedResponse.result], feed?.items ?? []));
                setNextCursor(feed?.nextCursor ?? null);
                setHasMore(feed?.hasMore ?? false);
                setActiveIndex(0);
                viewedIdsRef.current = new Set();
            })
            .catch(() => {
                if (isActive) toast.error("Could not load reel.");
            })
            .finally(() => {
                if (isActive) setIsLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [focusedReelId, loadReels]);

    useEffect(() => {
        if (!activeReel || viewedIdsRef.current.has(activeReel.id)) return;
        viewedIdsRef.current.add(activeReel.id);
        void reelService.recordView(activeReel.id);
    }, [activeReel]);

    useEffect(() => {
        if (!hasMore || isLoading || !nextCursor) return;
        if (activeIndex >= reels.length - 2) {
            void loadReels(nextCursor);
        }
    }, [activeIndex, hasMore, isLoading, loadReels, nextCursor, reels.length]);

    const goToPrevious = useCallback(() => {
        setActiveIndex((current) => Math.max(current - 1, 0));
    }, []);

    const goToNext = useCallback(() => {
        setActiveIndex((current) => Math.min(current + 1, Math.max(reels.length - 1, 0)));
    }, [reels.length]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowUp") {
                event.preventDefault();
                goToPrevious();
            }
            if (event.key === "ArrowDown" || event.key === " ") {
                event.preventDefault();
                goToNext();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goToNext, goToPrevious]);

    const translateStyle = useMemo(
        () => ({ transform: `translateY(-${activeIndex * 100}%)` }),
        [activeIndex],
    );

    const handleToggleLike = async (reel: Reel) => {
        setBusyReelId(reel.id);
        try {
            const hasReacted = reel.reactions?.some((reaction) => reaction.reactedByMe);
            const response = hasReacted
                ? await reelService.removeReaction(reel.id)
                : await reelService.react(reel.id, { type: "LIKE" });
            if (response.code === 1000 && response.result) {
                updateReel(response.result);
            }
        } catch {
            toast.error("Could not update reaction.");
        } finally {
            setBusyReelId(null);
        }
    };

    const handleCreated = () => {
        void loadReels(null, true);
    };

    const handleOpenAuthorProfile = useCallback(
        (reel: Reel) => {
            if (!reel.authorUsername) {
                toast.error("Could not open author profile.");
                return;
            }
            navigate(`/u/${reel.authorUsername}`);
        },
        [navigate],
    );

    const handleReportReel = useCallback((reel: Reel) => {
        setSelectedReportReel(reel);
    }, []);

    const handleSubmitReelReport = useCallback(
        async (payload: ReportPostRequest) => {
            if (!selectedReportReel) {
                return;
            }
            setIsReportingReel(true);
            try {
                const response = await reelService.report(selectedReportReel.id, payload);
                if (response.code !== 1000) {
                    toast.error(response.message ?? "Could not report reel.");
                    return;
                }
                toast.success("Reel reported successfully.");
                setSelectedReportReel(null);
            } catch {
                toast.error("Could not report reel.");
            } finally {
                setIsReportingReel(false);
            }
        },
        [selectedReportReel],
    );

    return (
        <div className="relative h-full w-full overflow-hidden bg-black text-white">
            <div className="absolute left-5 top-5 z-20 flex items-center gap-2">
                <Clapperboard className="h-6 w-6 text-white" />
                <h1 className="text-xl font-bold">Reels</h1>
            </div>

            <Button
                type="button"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="absolute right-5 top-5 z-20 rounded-full bg-white text-black hover:bg-white/90"
            >
                <Plus className="mr-1.5 h-4 w-4" />
                Create
            </Button>

            {isEmpty && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <Clapperboard className="h-12 w-12 text-white/60" />
                    <p className="text-lg font-semibold">No reels yet</p>
                    <p className="max-w-sm text-sm text-white/60">
                        Create the first reel or come back after more people share videos.
                    </p>
                </div>
            )}

            {reels.length > 0 && (
                <div
                    className="h-full w-full transition-transform duration-300 ease-out"
                    style={translateStyle}
                >
                    {reels.map((reel, index) => (
                        <ReelSlide
                            key={reel.id}
                            reel={reel}
                            isActive={index === activeIndex}
                            isBusy={busyReelId === reel.id}
                            onToggleLike={(selectedReel) => void handleToggleLike(selectedReel)}
                            onOpenComments={setSelectedCommentsReel}
                            onShare={setSelectedShareReel}
                            onOpenAuthorProfile={handleOpenAuthorProfile}
                            onReport={handleReportReel}
                        />
                    ))}
                </div>
            )}

            <div className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3">
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={activeIndex === 0}
                    onClick={goToPrevious}
                    className="rounded-full border-white/30 bg-black/30 text-white hover:bg-white/20"
                >
                    <ChevronUp className="h-5 w-5" />
                </Button>
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={activeIndex >= reels.length - 1 && !hasMore}
                    onClick={goToNext}
                    className="rounded-full border-white/30 bg-black/30 text-white hover:bg-white/20"
                >
                    <ChevronDown className="h-5 w-5" />
                </Button>
            </div>

            {isLoading && (
                <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
            )}

            <CreateReelModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                user={user}
                onCreated={handleCreated}
            />
            <ReelCommentsDialog
                reel={selectedCommentsReel}
                open={selectedCommentsReel !== null}
                onOpenChange={(open) => !open && setSelectedCommentsReel(null)}
                onCommentAdded={incrementCommentCount}
            />
            <ShareReelDialog
                reel={selectedShareReel}
                open={selectedShareReel !== null}
                onOpenChange={(open) => !open && setSelectedShareReel(null)}
                onShared={updateReel}
            />
            <ReportPostDialog
                open={selectedReportReel !== null}
                isSubmitting={isReportingReel}
                onOpenChange={(open) => !open && setSelectedReportReel(null)}
                onSubmit={handleSubmitReelReport}
            />
        </div>
    );
}
