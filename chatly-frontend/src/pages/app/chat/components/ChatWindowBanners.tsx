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
    const preview =
        current.content ??
        (current.type === "POLL" ? `Poll: ${current.poll?.question}` : "[attachment]");

    return (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/35 shrink-0">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15 text-brand shrink-0">
                <Pin size={11} />
            </div>
            <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => onHighlight(current.id)}
            >
                <div className="text-[11px] font-semibold text-brand/90">
                    Pinned {pinnedMessages.length > 1 ? `(${pinnedMessages.length})` : ""}
                </div>
                <p className="truncate text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {preview}
                </p>
            </button>
            {pinnedMessages.length > 1 && (
                <div className="flex items-center gap-1 shrink-0 rounded-full border border-border/60 bg-background/70 px-1 py-0.5">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="p-0.5 rounded-full hover:bg-accent transition-colors"
                    >
                        <ChevronLeft size={12} />
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                        {currentPinnedIdx + 1}/{pinnedMessages.length}
                    </span>
                    <button
                        type="button"
                        onClick={onNext}
                        className="p-0.5 rounded-full hover:bg-accent transition-colors"
                    >
                        <ChevronRight size={12} />
                    </button>
                </div>
            )}
            <button
                type="button"
                title="Unpin"
                onClick={() => onUnpin(current.id)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
                <PinOff size={13} />
            </button>
            <button
                type="button"
                title="See all pinned"
                onClick={onShowAll}
                className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-2 py-1 text-[11px] font-medium text-brand hover:bg-accent transition-colors shrink-0"
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
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-brand/5 text-sm shrink-0">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15 text-brand shrink-0">
                <BarChart3 size={11} />
            </div>
            <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => onHighlight(activePoll.id)}
            >
                <div className="text-[11px] font-semibold text-brand">Active Poll</div>
                <p className="truncate text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {activePoll.poll?.question}
                </p>
            </button>
            <button
                type="button"
                onClick={() => onHighlight(activePoll.id)}
                className="inline-flex items-center rounded-full border border-brand/25 bg-background/80 px-2 py-1 text-[11px] text-brand hover:bg-brand/10 transition-colors shrink-0 font-medium"
            >
                Vote
            </button>
            <button
                type="button"
                title="Dismiss"
                onClick={() => onDismiss(activePoll.id)}
                className="p-1 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            >
                <XIcon size={13} />
            </button>
        </div>
    );
});
