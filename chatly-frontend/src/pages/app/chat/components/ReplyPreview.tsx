import { cn } from "@/lib/utils";
import type { Message, ChatUser } from "@/types/message";

interface ReplyPreviewProps {
    replyMessage: Message;
    participant: ChatUser;
    currentUserId: string;
    senderName?: string;
    /** if it's my own message, the color will be inverted */
    isMe?: boolean;
}

export function ReplyPreview({ replyMessage, participant, currentUserId, senderName, isMe }: ReplyPreviewProps) {
    const resolvedSenderName =
        senderName ??
        (replyMessage.senderId === currentUserId
            ? "You"
            : participant.displayName.split(" ").slice(-1)[0]);

    return (
        <div
            className={cn(
                "rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 text-xs max-w-full overflow-hidden",
                isMe
                    ? "bg-white/15 border-white/50 text-white/80"
                    : "bg-muted/50 border-brand/60 text-muted-foreground",
            )}
        >
            <p className={cn("font-semibold text-[10px] mb-0.5", isMe ? "text-white/90" : "text-brand")}>
                {resolvedSenderName}
            </p>
            <p className="line-clamp-1 text-[11px]">{replyMessage.content}</p>
        </div>
    );
}
