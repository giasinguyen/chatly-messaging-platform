import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Message, ChatUser } from "@/types/message";
import { toMessagePreviewText } from "./richTextMessage.utils";

interface ReplyPreviewProps {
    replyMessage: Message;
    participant: ChatUser;
    currentUserId: string;
    senderName?: string;
    /** if it's my own message, the color will be inverted */
    isMe?: boolean;
}

export function ReplyPreview({ replyMessage, participant, currentUserId, senderName, isMe }: ReplyPreviewProps) {
    const { t } = useTranslation();
    const previewText = toMessagePreviewText(replyMessage.content);
    const imageAttachment = replyMessage.attachments?.find((attachment) =>
        attachment.type?.startsWith("image/"),
    );
    const resolvedSenderName =
        senderName ??
        (replyMessage.senderId === currentUserId
            ? t("common.you")
            : participant.displayName.split(" ").slice(-1)[0]);

    const handleScrollToOriginal = useCallback(() => {
        const el = document.querySelector(`[data-message-id="${replyMessage.id}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlight-reply-target");
        setTimeout(() => el.classList.remove("highlight-reply-target"), 1500);
    }, [replyMessage.id]);

    return (
        <button
            type="button"
            onClick={handleScrollToOriginal}
            className={cn(
                "w-full text-left rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 text-xs max-w-full overflow-hidden cursor-pointer transition-opacity hover:opacity-75",
                isMe
                    ? "bg-white/15 border-white/50 text-white/80"
                    : "bg-muted/50 border-[#1a146b]/60 text-muted-foreground",
            )}
        >
            <p className={cn("font-semibold text-[10px] mb-0.5", isMe ? "text-white/90" : "text-[#1a146b] dark:text-[#818cf8]")}>
                {resolvedSenderName}
            </p>
            <div className="flex items-center gap-2">
                {imageAttachment && (
                    <img
                        src={imageAttachment.url}
                        alt={imageAttachment.name ?? "Replied image"}
                        className="h-15 w-15 shrink-0 rounded-lg object-cover"
                    />
                )}
                <p className="line-clamp-1 min-w-0 text-[11px]">
                    {previewText || (imageAttachment ? "Photo" : "")}
                </p>
            </div>
        </button>
    );
}
