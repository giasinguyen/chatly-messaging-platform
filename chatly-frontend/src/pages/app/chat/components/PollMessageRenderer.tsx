import { BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PollVoterPopover } from "./PollVoterPopover";
import type { Message, ChatUser, Poll } from "@/types/message";

interface PollMessageRendererProps {
    msg: Message & { poll: Poll };
    currentUserId: string;
    participantDirectory: Record<string, ChatUser>;
    isMe: boolean;
    onVotePoll?: (messageId: string, optionIndex: number) => void;
    onClosePoll?: (messageId: string) => void;
}

export function PollMessageRenderer({
    msg,
    currentUserId,
    participantDirectory,
    isMe,
    onVotePoll,
    onClosePoll,
}: PollMessageRendererProps) {
    const poll = msg.poll;
    const isClosed = poll.closed === true;
    const totalVoters = new Set(Object.values(poll.votes ?? {}).flat()).size;
    const myVotedOptions = Object.entries(poll.votes ?? {})
        .filter(([, voters]) => voters.includes(currentUserId))
        .map(([idx]) => Number(idx));
    const allVoterIds = [...new Set(Object.values(poll.votes ?? {}).flat())];

    return (
        <div className="w-80 rounded-2xl shadow-sm border border-border/50 bg-background dark:bg-zinc-900">
            <div className="px-4 py-3 flex items-center gap-2 bg-brand/10 border-b border-brand/20">
                <BarChart3 size={16} className="text-brand shrink-0" />
                <span className="text-sm font-semibold text-foreground flex-1">
                    {poll.question}
                </span>
                {isClosed && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border shrink-0">
                        Ended
                    </span>
                )}
            </div>
            <div className="px-3 py-2 space-y-1.5">
                {poll.options.map((option, idx) => {
                    const voterCount = (poll.votes?.[String(idx)] ?? []).length;
                    const pct =
                        totalVoters > 0
                            ? Math.round((voterCount / totalVoters) * 100)
                            : 0;
                    const isVoted = myVotedOptions.includes(idx);
                    return (
                        <button
                            key={idx}
                            type="button"
                            disabled={isClosed}
                            onClick={() => !isClosed && onVotePoll?.(msg.id, idx)}
                            className={cn(
                                "relative w-full text-left rounded-lg px-3 py-2 text-sm transition-all border",
                                isClosed
                                    ? "opacity-70 cursor-default border-border/30"
                                    : isVoted
                                    ? "border-brand/60 bg-brand/10 font-medium"
                                    : "border-border/40 hover:border-brand/40 hover:bg-brand/5",
                            )}
                        >
                            <div
                                className={cn(
                                    "absolute inset-y-0 left-0 transition-all duration-300",
                                    isVoted ? "bg-brand/15" : "bg-muted/40",
                                )}
                                style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex items-center justify-between gap-2">
                                <span className="truncate">{option}</span>
                                <PollVoterPopover
                                    voterIds={poll.votes?.[String(idx)] ?? []}
                                    participantDirectory={participantDirectory}
                                    optionLabel={option}
                                    anonymous={poll.anonymous}
                                >
                                    <span className="text-xs text-muted-foreground shrink-0 cursor-pointer hover:underline">
                                        {voterCount > 0 && `${pct}%`}
                                    </span>
                                </PollVoterPopover>
                            </div>
                        </button>
                    );
                })}
            </div>
            <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/30 flex items-center justify-between">
                <PollVoterPopover
                    voterIds={allVoterIds}
                    participantDirectory={participantDirectory}
                    optionLabel="All voters"
                    anonymous={poll.anonymous}
                >
                    <span className="cursor-pointer hover:underline">
                        {totalVoters} voter{totalVoters !== 1 ? "s" : ""}
                    </span>
                </PollVoterPopover>
                <div className="flex items-center gap-2">
                    <span>
                        {poll.multipleChoice ? "Multiple choices" : "Single choice"}
                    </span>
                    {isMe && !isClosed && (
                        <button
                            type="button"
                            onClick={() => onClosePoll?.(msg.id)}
                            className="text-[11px] text-red-500 hover:text-red-600 hover:underline font-medium transition-colors"
                        >
                            End poll
                        </button>
                    )}
                </div>
            </div>
            {poll.deadline && (
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(poll.deadline).getTime() < Date.now() ? (
                        <span className="text-red-500">Expired</span>
                    ) : (
                        <span>
                            Ends{" "}
                            {new Date(poll.deadline).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
