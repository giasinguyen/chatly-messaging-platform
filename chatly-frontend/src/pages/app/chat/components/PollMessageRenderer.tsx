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
        <div className="w-80 rounded-2xl shadow-md border border-slate-100 dark:border-[#272935] bg-white dark:bg-[#1f2029] overflow-hidden">
            {/* Poll Header */}
            <div className="px-4 py-3.5 flex items-center gap-2.5 bg-[#e2dfff]/20 dark:bg-[#312e81]/25 border-b border-slate-100 dark:border-[#272935]">
                <BarChart3 size={16} className="text-[#1a146b] dark:text-[#a5b4fc] shrink-0" />
                <span className="text-sm font-bold text-[#1a146b] dark:text-white flex-1 leading-snug">
                    {poll.question}
                </span>
                {isClosed && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#272935] text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                        Ended
                    </span>
                )}
            </div>

            {/* Poll Options */}
            <div className="px-3.5 py-3 space-y-2">
                {poll.options.map((option, idx) => {
                    const voterIds = poll.votes?.[String(idx)] ?? [];
                    const voterCount = voterIds.length;
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
                                "relative w-full text-left rounded-xl px-3.5 py-2.5 text-xs transition-all border outline-none cursor-pointer select-none",
                                isClosed
                                    ? "opacity-75 cursor-default border-slate-100 dark:border-slate-800"
                                    : isVoted
                                    ? "border-[#1a146b]/40 bg-[#1a146b]/5 dark:border-[#818cf8]/40 dark:bg-[#312e81]/15 font-semibold text-[#1a146b] dark:text-white"
                                    : "border-slate-100 hover:border-slate-200 dark:border-slate-800/60 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#272935]/40 text-slate-700 dark:text-slate-350",
                            )}
                        >
                            {/* Voting progress background bar */}
                            <div
                                className={cn(
                                    "absolute inset-y-0 left-0 transition-all duration-300 rounded-l-xl",
                                    isVoted
                                        ? "bg-[#1a146b]/10 dark:bg-[#818cf8]/15"
                                        : "bg-slate-100 dark:bg-[#272935]/60",
                                    pct === 100 && "rounded-r-xl"
                                )}
                                style={{ width: `${pct}%` }}
                            />
                            
                            <div className="relative flex items-center justify-between gap-3">
                                <span className="truncate pr-1">{option}</span>
                                
                                <div className="flex items-center gap-1.5 shrink-0 select-none">
                                    {/* Small voter avatars stack */}
                                    {voterCount > 0 && (
                                        <div className="flex items-center -space-x-1.5 mr-1">
                                            {poll.anonymous ? (
                                                <div
                                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 text-[10px] font-bold text-slate-500 border border-white dark:border-zinc-900"
                                                    title="Anonymous voter"
                                                >
                                                    ?
                                                </div>
                                            ) : (
                                                voterIds.slice(0, 3).map((voterId) => {
                                                    const voter = participantDirectory[voterId];
                                                    const name = voter?.displayName ?? voter?.username ?? "User";
                                                    return (
                                                        <img
                                                            key={voterId}
                                                            src={voter?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`}
                                                            alt={name}
                                                            title={name}
                                                            className="h-5 w-5 rounded-full object-cover border border-white dark:border-zinc-900 shadow-sm"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
                                                            }}
                                                        />
                                                    );
                                                })
                                            )}
                                            {voterCount > 3 && !poll.anonymous && (
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-350 border border-white dark:border-zinc-900 shadow-sm">
                                                    +{voterCount - 3}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <PollVoterPopover
                                        voterIds={voterIds}
                                        participantDirectory={participantDirectory}
                                        optionLabel={option}
                                        anonymous={poll.anonymous}
                                    >
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer">
                                            {voterCount > 0 && `${pct}% (${voterCount})`}
                                        </span>
                                    </PollVoterPopover>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer Summary */}
            <div className="px-4 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#1a1c23]/30 flex items-center justify-between">
                <PollVoterPopover
                    voterIds={allVoterIds}
                    participantDirectory={participantDirectory}
                    optionLabel="All voters"
                    anonymous={poll.anonymous}
                >
                    <span className="cursor-pointer hover:underline font-semibold text-slate-600 dark:text-slate-300">
                        {totalVoters} voter{totalVoters !== 1 ? "s" : ""}
                    </span>
                </PollVoterPopover>
                
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 dark:text-slate-500">
                        {poll.multipleChoice ? "Multiple choices" : "Single choice"}
                    </span>
                    {isMe && !isClosed && (
                        <button
                            type="button"
                            onClick={() => onClosePoll?.(msg.id)}
                            className="text-[11px] text-red-500 hover:text-red-650 hover:underline font-semibold transition-colors cursor-pointer"
                        >
                            End poll
                        </button>
                    )}
                </div>
            </div>

            {poll.deadline && (
                <div className="px-4 py-2 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(poll.deadline).getTime() < Date.now() ? (
                        <span className="text-red-500 font-bold">Expired</span>
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
