import { memo } from "react";
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Pin,
    PinOff,
    X as XIcon,
} from "lucide-react";
import type { Message } from "@/types/message";

interface PinnedBannerProps {
    pinnedMessages: Message[];
    currentPinnedIdx: number;
    onPrev: () => void;
    onNext: () => void;
    onHighlight: (messageId: string) => void;
    onUnpin: (messageId: string) => void;
    onShowAll: () => void;
}

export const PinnedMessagesBanner = memo(function PinnedMessagesBanner({
    pinnedMessages,
    currentPinnedIdx,
    onPrev,
    onNext,
    onHighlight,
    onUnpin,
    onShowAll,
}: PinnedBannerProps) {
    if (pinnedMessages.length === 0) return null;
    const current = pinnedMessages[currentPinnedIdx];
    if (!current) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-amber-50/80 dark:bg-amber-950/30 text-sm shrink-0">
            <Pin size={13} className="text-amber-500 shrink-0" />
            <button
                type="button"
                className="flex-1 text-left truncate text-foreground/90 hover:text-foreground transition-colors text-xs"
                onClick={() => onHighlight(current.id)}
            >
                <span className="font-medium text-amber-600 dark:text-amber-400 mr-1">
                    Pinned
                </span>
                {current.content ??
                    (current.type === "POLL"
                        ? `Poll: ${current.poll?.question}`
                        : "[attachment]")}
            </button>
            {pinnedMessages.length > 1 && (
                <div className="flex items-center gap-0.5 shrink-0">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="p-0.5 rounded hover:bg-amber-200/60 dark:hover:bg-amber-800/40"
                    >
                        <ChevronLeft size={13} />
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                        {currentPinnedIdx + 1}/{pinnedMessages.length}
                    </span>
                    <button
                        type="button"
                        onClick={onNext}
                        className="p-0.5 rounded hover:bg-amber-200/60 dark:hover:bg-amber-800/40"
                    >
                        <ChevronRight size={13} />
                    </button>
                </div>
            )}
            <button
                type="button"
                title="Unpin"
                onClick={() => onUnpin(current.id)}
                className="p-1 rounded hover:bg-amber-200/60 dark:hover:bg-amber-800/40 shrink-0"
            >
                <PinOff size={13} className="text-amber-500" />
            </button>
            <button
                type="button"
                title="See all pinned"
                onClick={onShowAll}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline shrink-0 font-medium"
            >
                All
            </button>
        </div>
    );
});

interface PollBannerProps {
    activePoll: Message;
    onHighlight: (messageId: string) => void;
    onDismiss: (messageId: string) => void;
}

export const ActivePollBanner = memo(function ActivePollBanner({
    activePoll,
    onHighlight,
    onDismiss,
}: PollBannerProps) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-brand/5 dark:bg-brand/10 text-sm shrink-0">
            <BarChart3 size={13} className="text-brand shrink-0" />
            <button
                type="button"
                className="flex-1 text-left truncate text-foreground/90 hover:text-foreground transition-colors text-xs"
                onClick={() => onHighlight(activePoll.id)}
            >
                <span className="font-medium text-brand mr-1">Poll:</span>
                {activePoll.poll?.question}
            </button>
            <button
                type="button"
                onClick={() => onHighlight(activePoll.id)}
                className="text-[11px] text-brand hover:underline shrink-0 font-medium"
            >
                Vote
            </button>
            <button
                type="button"
                title="Dismiss"
                onClick={() => onDismiss(activePoll.id)}
                className="p-1 rounded hover:bg-brand/10 shrink-0"
            >
                <XIcon size={13} className="text-muted-foreground" />
            </button>
        </div>
    );
});
