import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Pause, Play, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { storyService } from "@/services/story.service";
import type { Story, StoryReactionResponse, StoryReplyResponse } from "@/types/story";
import type { UserResponse } from "@/types/auth";

const STORY_BG_GRADIENTS = [
    "from-purple-600 via-pink-500 to-orange-400",
    "from-blue-600 via-cyan-500 to-emerald-400",
    "from-rose-600 via-red-500 to-amber-400",
    "from-indigo-600 via-violet-500 to-fuchsia-400",
    "from-teal-600 via-green-500 to-lime-400",
    "from-slate-700 via-zinc-600 to-gray-500",
];

const STORY_DURATION_MS = 5000;

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👏"];

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
    onStoryDeleted?: (storyId: string) => void;
    onStoryViewed?: (storyId: string) => void;
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

export function StoryViewer({ groups, initialGroupIndex, onClose, onStoryDeleted, onStoryViewed }: StoryViewerProps) {
    const currentUser = useAuthStore((s) => s.user);
    const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [viewers, setViewers] = useState<UserResponse[]>([]);
    const [reactions, setReactions] = useState<StoryReactionResponse[]>([]);
    const [replies, setReplies] = useState<StoryReplyResponse[]>([]);
    const [ownerPanelTab, setOwnerPanelTab] = useState<"viewers" | "reactions" | "replies">("viewers");
    const [isOwnerPanelOpen, setIsOwnerPanelOpen] = useState(false);
    const [myReaction, setMyReaction] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isSendingReply, setIsSendingReply] = useState(false);
    const timerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentGroup = groups[groupIndex];
    const currentStory = currentGroup?.stories[storyIndex];
    const totalStories = currentGroup?.stories.length ?? 0;
    const isOwnStory = !!currentUser && currentStory?.userId === currentUser.id;

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

    // Record view + reset panels when story changes
    useEffect(() => {
        if (!currentStory?.id) return;
        storyService.recordView(currentStory.id).then(() => {
            onStoryViewed?.(currentStory.id);
        }).catch(() => {});
        setViewers([]);
        setReactions([]);
        setReplies([]);
        setIsOwnerPanelOpen(false);
        setMyReaction(null);
        setReplyText("");
    }, [currentStory?.id]);

    const handleOpenOwnerPanel = useCallback(async (tab: "viewers" | "reactions" | "replies") => {
        if (!currentStory?.id) return;
        setIsPaused(true);
        setOwnerPanelTab(tab);
        setIsOwnerPanelOpen(true);

        try {
            if (tab === "viewers" && viewers.length === 0) {
                const res = await storyService.getViewers(currentStory.id);
                setViewers(res.result ?? []);
            } else if (tab === "reactions" && reactions.length === 0) {
                const res = await storyService.getReactions(currentStory.id);
                setReactions(res.result ?? []);
            } else if (tab === "replies" && replies.length === 0) {
                const res = await storyService.getReplies(currentStory.id);
                setReplies(res.result ?? []);
            }
        } catch {
            toast.error("Failed to load data");
        }
    }, [currentStory?.id, viewers.length, reactions.length, replies.length]);

    const handleOwnerPanelTabChange = useCallback(async (tab: "viewers" | "reactions" | "replies") => {
        setOwnerPanelTab(tab);
        if (!currentStory?.id) return;
        try {
            if (tab === "viewers" && viewers.length === 0) {
                const res = await storyService.getViewers(currentStory.id);
                setViewers(res.result ?? []);
            } else if (tab === "reactions" && reactions.length === 0) {
                const res = await storyService.getReactions(currentStory.id);
                setReactions(res.result ?? []);
            } else if (tab === "replies" && replies.length === 0) {
                const res = await storyService.getReplies(currentStory.id);
                setReplies(res.result ?? []);
            }
        } catch {
            toast.error("Failed to load data");
        }
    }, [currentStory?.id, viewers.length, reactions.length, replies.length]);

    const handleReact = useCallback(async (emoji: string) => {
        if (!currentStory?.id) return;
        try {
            if (myReaction === emoji) {
                await storyService.removeReaction(currentStory.id);
                setMyReaction(null);
            } else {
                await storyService.reactToStory(currentStory.id, emoji);
                setMyReaction(emoji);
                toast.success("Reacted " + emoji);
            }
        } catch {
            toast.error("Failed to react");
        }
    }, [currentStory?.id, myReaction]);

    const handleSendReply = useCallback(async () => {
        if (!currentStory?.id || !replyText.trim()) return;
        setIsSendingReply(true);
        try {
            await storyService.replyToStory(currentStory.id, replyText.trim());
            setReplyText("");
            toast.success("Reply sent");
        } catch {
            toast.error("Failed to send reply");
        } finally {
            setIsSendingReply(false);
        }
    }, [currentStory?.id, replyText]);

    const handleDelete = useCallback(async () => {
        if (!currentStory?.id) return;
        if (!window.confirm("Delete this story? This cannot be undone.")) return;
        try {
            await storyService.deleteStory(currentStory.id);
            toast.success("Story deleted");
            onStoryDeleted?.(currentStory.id);
            onClose();
        } catch {
            toast.error("Failed to delete story");
        }
    }, [currentStory?.id, onStoryDeleted, onClose]);

    if (!currentGroup || !currentStory) return null;

    const user = currentGroup.user;
    const userInitial = user.displayName?.charAt(0)?.toUpperCase() ?? "U";

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
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
                className="relative w-full max-w-105 h-[85vh] max-h-190 rounded-2xl overflow-hidden shadow-2xl"
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
                            "absolute inset-0 flex items-center justify-center bg-linear-to-br p-8",
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
                <div className="absolute inset-0 bg-linear-to-b from-black/50 via-transparent to-black/30 pointer-events-none" />

                {/* Progress bars */}
                <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-20">
                    {currentGroup.stories.map((_, idx) => (
                        <div
                            key={`progress-${idx}`}
                            className="flex-1 h-0.75 rounded-full bg-white/30 overflow-hidden"
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

                    <div className="flex items-center gap-1">
                        {isOwnStory && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="p-1.5 rounded-full hover:bg-red-500/30 transition-colors"
                                title="Delete story"
                            >
                                <Trash2 className="h-4 w-4 text-white" />
                            </button>
                        )}
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

                {/* Music indicator — hidden when owner panel is open */}
                {currentStory.musicName && !isOwnerPanelOpen && (
                    <div className="absolute bottom-16 left-4 right-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-2">
                        <span className="text-white text-xs animate-pulse">♫</span>
                        <span className="text-white/80 text-xs truncate">
                            {currentStory.musicName}
                        </span>
                    </div>
                )}

                {/* Bottom bar — own story: view count + owner panel button */}
                {isOwnStory && !isOwnerPanelOpen && (
                    <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleOpenOwnerPanel("viewers")}
                            className="flex-1 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2.5 hover:bg-black/70 transition-colors"
                        >
                            <Eye className="h-4 w-4 text-white shrink-0" />
                            <span className="text-white text-sm font-medium">
                                {currentStory.viewCount ?? 0}{" "}
                                {currentStory.viewCount === 1 ? "view" : "views"}
                            </span>
                            <span className="text-white/50 text-xs ml-auto">Tap to see</span>
                        </button>
                    </div>
                )}

                {/* Bottom bar — others' story: emoji reactions + reply input */}
                {!isOwnStory && (
                    <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2">
                        {/* Quick emoji reactions */}
                        <div className="flex items-center justify-center gap-2">
                            {QUICK_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleReact(emoji)}
                                    className={cn(
                                        "text-xl p-1.5 rounded-full transition-all hover:scale-125",
                                        myReaction === emoji
                                            ? "bg-white/30 scale-125"
                                            : "bg-black/30 hover:bg-black/50",
                                    )}
                                    title={`React ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        {/* Reply input */}
                        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        void handleSendReply();
                                    }
                                }}
                                placeholder="Reply to story..."
                                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none"
                                maxLength={500}
                            />
                            <button
                                type="button"
                                onClick={() => void handleSendReply()}
                                disabled={!replyText.trim() || isSendingReply}
                                className="p-1 rounded-full hover:bg-white/20 transition-colors disabled:opacity-40"
                            >
                                <Send className="h-4 w-4 text-white" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Owner panel — slides up from bottom with tabs: Viewers / Reactions / Replies */}
                {isOwnStory && isOwnerPanelOpen && (
                    <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-md rounded-b-2xl max-h-72 flex flex-col">
                        {/* Header with tabs */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-0 shrink-0">
                            <div className="flex gap-3">
                                {(["viewers", "reactions", "replies"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => void handleOwnerPanelTabChange(tab)}
                                        className={cn(
                                            "text-sm font-semibold pb-2 border-b-2 transition-colors capitalize",
                                            ownerPanelTab === tab
                                                ? "text-white border-white"
                                                : "text-white/40 border-transparent hover:text-white/60",
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOwnerPanelOpen(false);
                                    setIsPaused(false);
                                }}
                                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="h-4 w-4 text-white/60" />
                            </button>
                        </div>
                        <div className="border-b border-white/10 mx-4" />

                        {/* Tab content */}
                        <div className="overflow-y-auto flex-1 py-2">
                            {ownerPanelTab === "viewers" && (
                                viewers.length === 0 ? (
                                    <p className="text-center text-white/40 text-sm py-4">No viewers yet</p>
                                ) : (
                                    viewers.map((viewer) => (
                                        <div key={viewer.id} className="flex items-center gap-3 px-4 py-2">
                                            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/20 shrink-0">
                                                {viewer.avatarUrl ? (
                                                    <img src={viewer.avatarUrl} alt={viewer.displayName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-xs font-bold text-white">
                                                        {viewer.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-white text-sm">{viewer.displayName ?? viewer.username}</span>
                                        </div>
                                    ))
                                )
                            )}

                            {ownerPanelTab === "reactions" && (
                                reactions.length === 0 ? (
                                    <p className="text-center text-white/40 text-sm py-4">No reactions yet</p>
                                ) : (
                                    reactions.map((r) => (
                                        <div key={r.id} className="flex items-center gap-3 px-4 py-2">
                                            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/20 shrink-0">
                                                {r.user?.avatarUrl ? (
                                                    <img src={r.user.avatarUrl} alt={r.user.displayName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-xs font-bold text-white">
                                                        {r.user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-white text-sm flex-1">{r.user?.displayName ?? r.user?.username}</span>
                                            <span className="text-xl">{r.emoji}</span>
                                        </div>
                                    ))
                                )
                            )}

                            {ownerPanelTab === "replies" && (
                                replies.length === 0 ? (
                                    <p className="text-center text-white/40 text-sm py-4">No replies yet</p>
                                ) : (
                                    replies.map((r) => (
                                        <div key={r.id} className="flex items-start gap-3 px-4 py-2">
                                            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/20 shrink-0 mt-0.5">
                                                {r.user?.avatarUrl ? (
                                                    <img src={r.user.avatarUrl} alt={r.user.displayName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-xs font-bold text-white">
                                                        {r.user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white/70 text-xs">{r.user?.displayName ?? r.user?.username}</span>
                                                <span className="text-white text-sm">{r.content}</span>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
