import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Message, ChatUser } from "@/types/message";
import type { ConversationType } from "@/types/conversation";
import { formatSeenTime } from "./messageList.utils";

interface MessageSeenIndicatorProps {
    msg: Message;
    currentUserId: string;
    participantDirectory: Record<string, ChatUser>;
    conversationType: ConversationType;
}

export function MessageSeenIndicator({
    msg,
    currentUserId,
    participantDirectory,
    conversationType,
}: MessageSeenIndicatorProps) {
    const readers = msg.readBy.filter((r) => r.userId !== currentUserId);
    if (readers.length === 0) return null;

    if (conversationType === "PRIVATE") {
        const receipt = readers[0];
        const reader = participantDirectory[receipt.userId];
        return (
            <div className="flex items-center gap-1 px-1 mt-0.5 justify-end">
                {reader?.avatarUrl && (
                    <Avatar className="h-3.5 w-3.5">
                        <AvatarImage src={reader.avatarUrl} />
                        <AvatarFallback className="text-[8px]">
                            {reader.displayName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                )}
                <span className="text-[10px] text-muted-foreground">
                    Seen {formatSeenTime(receipt.readAt)}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-0.5 px-1 mt-0.5 justify-end">
            <span className="text-[10px] text-muted-foreground mr-1">Seen</span>
            {readers.slice(0, 3).map((r) => {
                const reader = participantDirectory[r.userId];
                return (
                    <Avatar key={r.userId} className="h-3.5 w-3.5">
                        <AvatarImage src={reader?.avatarUrl} />
                        <AvatarFallback className="text-[8px]">
                            {reader?.displayName?.charAt(0) ?? "?"}
                        </AvatarFallback>
                    </Avatar>
                );
            })}
            {readers.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                    +{readers.length - 3}
                </span>
            )}
        </div>
    );
}
