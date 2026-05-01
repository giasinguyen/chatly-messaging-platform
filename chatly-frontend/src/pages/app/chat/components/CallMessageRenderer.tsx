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
    const normalizedStatus = (callData.status ?? "").toUpperCase();
    const isMissed = normalizedStatus === "MISSED" || normalizedStatus === "REJECTED";
    const isGroupCallActiveStatus =
        normalizedStatus === "RINGING" || normalizedStatus === "ONGOING";
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
                    <div className="inline-flex items-center gap-3 rounded-2xl px-5 py-3 border border-border/60 bg-muted/40 text-muted-foreground">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
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
                        className="inline-flex items-center gap-3 rounded-2xl px-5 py-3 border border-brand/30 bg-brand/8 text-brand transition-colors hover:bg-brand/15 cursor-pointer"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15">
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
                    "inline-flex items-start gap-2 rounded-2xl px-4 py-2.5 border flex-col max-w-60",
                    isMissed
                        ? "bg-destructive/10 border-destructive/25 text-destructive"
                        : "bg-muted/50 border-border/60 text-foreground",
                )}
            >
                <div className="flex items-center gap-2">
                    <PhoneCall size={13} className={cn(!isMissed && "text-brand")} />
                    <span className="text-xs font-medium">{statusLabel}</span>
                </div>
                {!isMissed && duration > 0 && (
                    <span className="text-[11px] text-muted-foreground">{formatDuration(duration)}</span>
                )}
                {isMissed && !isMe && onCallAgain && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="self-stretch h-7 text-[11px] px-2 justify-center hover:bg-destructive/15"
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
