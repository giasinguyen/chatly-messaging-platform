import { cn } from "@/lib/utils";
import type { Message, User } from "@/mocks/chat";

interface ReplyPreviewProps {
    replyMessage: Message;
    participant: User;
    /** nếu là tin nhắn của mình thì màu sẽ đảo ngược */
    isMe?: boolean;
}

export function ReplyPreview({ replyMessage, participant, isMe }: ReplyPreviewProps) {
    const senderName = replyMessage.senderId === "me" ? "Bạn" : participant.name.split(" ").slice(-1)[0];

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
                {senderName}
            </p>
            <p className="line-clamp-1 text-[11px]">{replyMessage.text}</p>
        </div>
    );
}
