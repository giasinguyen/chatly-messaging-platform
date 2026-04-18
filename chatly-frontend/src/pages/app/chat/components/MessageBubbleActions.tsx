import { Reply, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/message";
import { QUICK_EMOJIS } from "./messageList.utils";

interface MessageBubbleActionsProps {
    msg: Message;
    isMe: boolean;
    onReply: (msg: Message) => void;
    onReact: (messageId: string, emoji: string) => void;
}

export function MessageBubbleActions({
    msg,
    isMe,
    onReply,
    onReact,
}: MessageBubbleActionsProps) {
    return (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <div className="relative group/react">
                <button
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="React"
                >
                    <SmilePlus size={14} />
                </button>
                <div
                    className={cn(
                        "absolute bottom-full pb-2 hidden group-hover/react:flex flex-col items-center z-50",
                        isMe ? "right-0" : "left-0",
                    )}
                >
                    <div className="flex items-center gap-0.5 bg-popover border border-border rounded-full px-1 py-0.5 shadow-lg">
                        {QUICK_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => onReact(msg.id, emoji)}
                                className="hover:scale-125 transition-transform text-base px-0.5"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <button
                onClick={() => onReply(msg)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Reply"
            >
                <Reply size={14} />
            </button>
        </div>
    );
}
