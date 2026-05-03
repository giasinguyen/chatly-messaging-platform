import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Story } from "@/types/story";

const STORY_BG_GRADIENTS = [
    "from-purple-600 via-pink-500 to-orange-400",
    "from-blue-600 via-cyan-500 to-emerald-400",
    "from-rose-600 via-red-500 to-amber-400",
    "from-indigo-600 via-violet-500 to-fuchsia-400",
    "from-teal-600 via-green-500 to-lime-400",
    "from-slate-700 via-zinc-600 to-gray-500",
];

const STORY_DURATION_MS = 5000;

interface StoryUser {
    id: string;
    displayName?: string;
    avatarUrl?: string;
    username?: string;
}

interface StoryGroup {
    user: StoryUser;
    stories: Story[];
}

interface StoryViewerProps {
    groups: StoryGroup[];
    initialGroupIndex: number;
    onClose: () => void;
}

function formatStoryTime(createdAt: string): string {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
}

export function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
    const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentGroup = groups[groupIndex];
    const currentStory = currentGroup?.stories[storyIndex];
    const totalStories = currentGroup?.stories.length ?? 0;

    const bgGradient = useMemo(() => {
        const idx = currentStory?.bgIndex ?? 0;
        return STORY_BG_GRADIENTS[idx % STORY_BG_GRADIENTS.length];
    }, [currentStory?.bgIndex]);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const goNext = useCallback(() => {
        if (storyIndex < totalStories - 1) {
            setStoryIndex((prev) => prev + 1);
            setProgress(0);
        } else if (groupIndex < groups.length - 1) {
            setGroupIndex((prev) => prev + 1);
            setStoryIndex(0);
            setProgress(0);
        } else {
            onClose();
        }
    }, [storyIndex, totalStories, groupIndex, groups.length, onClose]);

    const goPrev = useCallback(() => {
        if (storyIndex > 0) {
            setStoryIndex((prev) => prev - 1);
            setProgress(0);
        } else if (groupIndex > 0) {
            setGroupIndex((prev) => prev - 1);
            const prevGroup = groups[groupIndex - 1];
            setStoryIndex(prevGroup.stories.length - 1);
            setProgress(0);
        }
    }, [storyIndex, groupIndex, groups]);

    // Auto-advance timer
    useEffect(() => {
        clearTimer();
        if (isPaused || !currentStory) return;

        const interval = 50;
        const step = (interval / STORY_DURATION_MS) * 100;

        timerRef.current = window.setInterval(() => {
            setProgress((prev) => {
                const next = prev + step;
                if (next >= 100) {
                    goNext();
                    return 0;
                }
                return next;
            });
        }, interval);

        return clearTimer;
    }, [isPaused, currentStory, clearTimer, goNext]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowRight") goNext();
            if (event.key === "ArrowLeft") goPrev();
            if (event.key === " ") {
                event.preventDefault();
                setIsPaused((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, goNext, goPrev]);

    if (!currentGroup || !currentStory) return null;

    const user = currentGroup.user;
    const userInitial = user.displayName?.charAt(0)?.toUpperCase() ?? "U";

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
                <X className="h-6 w-6" />
            </button>

            {/* Previous group arrow */}
            {(groupIndex > 0 || storyIndex > 0) && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        goPrev();
                    }}
                    className="absolute left-4 md:left-8 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>
            )}

            {/* Next group arrow */}
            {(groupIndex < groups.length - 1 || storyIndex < totalStories - 1) && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        goNext();
                    }}
                    className="absolute right-4 md:right-8 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>
            )}

            {/* Story Card */}
            <div
                className="relative w-full max-w-[420px] h-[85vh] max-h-[760px] rounded-2xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Story Content */}
                {currentStory.mediaUrl ? (
                    currentStory.type === "VIDEO" ? (
                        <video
                            key={currentStory.id}
                            src={currentStory.mediaUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay
                            muted
                            playsInline
                        />
                    ) : (
                        <img
                            key={currentStory.id}
                            src={currentStory.mediaUrl}
                            alt="Story"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    )
                ) : (
                    <div
                        className={cn(
                            "absolute inset-0 flex items-center justify-center bg-gradient-to-br p-8",
                            bgGradient,
                        )}
                    >
                        <p
                            className="text-white text-center font-semibold leading-relaxed drop-shadow-lg"
                            style={{ fontSize: currentStory.fontSize ?? 24 }}
                        >
                            {currentStory.content}
                        </p>
                    </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30 pointer-events-none" />

                {/* Progress bars */}
                <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-20">
                    {currentGroup.stories.map((_, idx) => (
                        <div
                            key={`progress-${idx}`}
                            className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden"
                        >
                            <div
                                className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                                style={{
                                    width:
                                        idx < storyIndex
                                            ? "100%"
                                            : idx === storyIndex
                                              ? `${progress}%`
                                              : "0%",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-4 z-20">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full overflow-hidden bg-white/20 shrink-0">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.displayName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-sm font-bold text-white">
                                    {userInitial}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white drop-shadow-md">
                                {user.displayName ?? user.username ?? "User"}
                            </span>
                            <span className="text-xs text-white/60">
                                {formatStoryTime(currentStory.createdAt)}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsPaused((prev) => !prev)}
                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    >
                        {isPaused ? (
                            <Play className="h-4 w-4 text-white" />
                        ) : (
                            <Pause className="h-4 w-4 text-white" />
                        )}
                    </button>
                </div>

                {/* Tap zones for prev/next */}
                <div className="absolute inset-0 flex z-10">
                    <div
                        className="w-1/3 h-full cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            goPrev();
                        }}
                    />
                    <div
                        className="w-1/3 h-full cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsPaused((prev) => !prev);
                        }}
                    />
                    <div
                        className="w-1/3 h-full cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            goNext();
                        }}
                    />
                </div>

                {/* Music indicator */}
                {currentStory.musicName && (
                    <div className="absolute bottom-6 left-4 right-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-2">
                        <span className="text-white text-xs animate-pulse">♫</span>
                        <span className="text-white/80 text-xs truncate">
                            {currentStory.musicName}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
