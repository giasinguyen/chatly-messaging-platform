import { PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCallStore } from "@/store/call.store";
import type { Message, ChatUser } from "@/types/message";
import type { ConversationType } from "@/types/conversation";

interface CallData {
    callType?: string;
    status?: string;
    duration?: number;
    callId?: string;
}

interface CallMessageRendererProps {
    msg: Message;
    messages: Message[];
    currentUserId: string;
    participant: ChatUser;
    participantDirectory: Record<string, ChatUser>;
    conversationType: ConversationType;
    onCallAgain?: (calleeId: string, calleeName: string, calleeAvatar?: string) => void;
    onJoinGroupCall?: (callId: string) => void;
}

function parseCallData(content: string): CallData {
    try {
        return JSON.parse(content) as CallData;
    } catch {
        return {};
    }
}

function formatDuration(seconds: number): string {
    const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
    const ss = (seconds % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
}

export function CallMessageRenderer({
    msg,
    messages,
    currentUserId,
    participant,
    participantDirectory,
    conversationType,
    onCallAgain,
    onJoinGroupCall,
}: CallMessageRendererProps) {
    const callData = parseCallData(msg.content);
    const groupCallRealtimeState = useCallStore((state) => state.groupCallRealtimeState);
    const isMissed = callData.status === "MISSED" || callData.status === "REJECTED";
    const isGroupCallActiveStatus = callData.status === "RINGING" || callData.status === "ONGOING";
    const isVideo = callData.callType === "VIDEO";
    const duration = callData.duration ?? 0;
    const isMe = msg.senderId === currentUserId;
    const sender = participantDirectory[msg.senderId] ?? participant;
    const calleeId = isMe ? participant.id : msg.senderId;
    const typeLabel = isVideo ? "video" : "audio";

    if (isGroupCallActiveStatus && callData.callId && conversationType === "GROUP") {
        const realtimeState = groupCallRealtimeState[callData.callId];
        const isCallEnded = Boolean(realtimeState?.ended) || messages.some((m) => {
            if (m.id === msg.id || m.type !== "CALL") return false;
            const other = parseCallData(m.content);
            return (
                other.callId === callData.callId &&
                (other.status === "ENDED" || other.status === "MISSED")
            );
        });

        return (
            <div className="flex justify-center my-3 px-4">
                {isCallEnded ? (
                    <div className="inline-flex items-center gap-3 rounded-2xl px-5 py-3 border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 opacity-70">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20">
                            <PhoneCall size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Group {typeLabel} call</p>
                            <p className="text-xs opacity-70">Call ended</p>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => onJoinGroupCall?.(callData.callId!)}
                        className="inline-flex items-center gap-3 rounded-2xl px-5 py-3 border bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 transition-colors hover:bg-green-100 dark:hover:bg-green-950/60 cursor-pointer"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20">
                            <PhoneCall size={16} />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-medium">Group {typeLabel} call</p>
                            <p className="text-xs opacity-70">Tap to join</p>
                        </div>
                    </button>
                )}
            </div>
        );
    }

    const statusLabel = isMissed
        ? `Missed ${typeLabel} call`
        : `${isVideo ? "Video" : "Audio"} call`;

    return (
        <div className={cn("flex my-2 px-4", isMe ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "inline-flex items-start gap-2 rounded-2xl px-4 py-2.5 border flex-col max-w-[240px]",
                    isMissed
                        ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                        : "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",
                )}
            >
                <div className="flex items-center gap-2">
                    <PhoneCall size={13} />
                    <span className="text-xs font-medium">{statusLabel}</span>
                </div>
                {!isMissed && duration > 0 && (
                    <span className="text-[11px] opacity-70">{formatDuration(duration)}</span>
                )}
                {isMissed && !isMe && onCallAgain && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="self-stretch h-7 text-[11px] px-2 hover:bg-red-200/50 dark:hover:bg-red-800/50 justify-center"
                        onClick={() => onCallAgain(calleeId, sender.displayName, sender.avatarUrl)}
                    >
                        <PhoneCall size={12} className="mr-1" />
                        Call back
                    </Button>
                )}
            </div>
        </div>
    );
}
