import { AlertCircle, RefreshCcw, Trash2 } from "lucide-react";
import type { FailedMessageItem } from "./messageList.utils";

interface FailedMessageListProps {
    failedMessages: FailedMessageItem[];
    onRetryMessage?: (id: string) => void;
    onRemoveFailedMessage?: (id: string) => void;
}

export function FailedMessageList({
    failedMessages,
    onRetryMessage,
    onRemoveFailedMessage,
}: FailedMessageListProps) {
    if (failedMessages.length === 0) return null;

    return (
        <>
            {failedMessages.map((fmsg) => (
                <div
                    key={fmsg.id}
                    className="flex flex-col mb-4 items-end slide-in-from-right-2 animate-in duration-300"
                >
                    <div className="flex max-w-[75%] gap-2 items-center">
                        <span className="text-xs text-destructive flex items-center bg-destructive/10 px-2 py-1 rounded-full gap-1">
                            <AlertCircle size={12} /> Send failed
                        </span>
                        <div className="bg-destructive/20 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm border border-destructive/20 opacity-80 break-words select-text">
                            {fmsg.content ||
                                (fmsg.attachments?.length ? "[Attachment]" : "")}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center text-xs mt-1 mr-1 text-muted-foreground">
                        <button
                            onClick={() => onRetryMessage?.(fmsg.id)}
                            className="flex items-center gap-1 hover:text-brand transition cursor-pointer"
                        >
                            <RefreshCcw size={12} /> Retry
                        </button>
                        <span>•</span>
                        <button
                            onClick={() => onRemoveFailedMessage?.(fmsg.id)}
                            className="flex items-center gap-1 hover:text-destructive transition cursor-pointer"
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
}
