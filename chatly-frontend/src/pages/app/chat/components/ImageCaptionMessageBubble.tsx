import { Check, CheckCheck, Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Message, ChatUser } from "@/types/message";
import { ReplyPreview } from "./ReplyPreview";
import { TextMessageBody } from "./TextMessageBody";
import { ImageCaptionGallery } from "./ImageCaptionGallery";
import { useTranslation } from "react-i18next";

const IMAGE_CAPTION_MAX_WIDTH = "min(280px, 70vw)";
const IMAGE_CAPTION_MIN_WIDTH = "200px";

interface ImageCaptionMessageBubbleProps {
    msg: Message;
    isMe: boolean;
    isAgent: boolean;
    repliedMsg: Message | null;
    replySenderName?: string;
    participant: ChatUser;
    currentUserId: string;
    participantDirectory: Record<string, ChatUser>;
    highlightKeyword?: string | null;
    onOpenSenderProfile?: (userId: string) => void;
    onOpenImage: (attachmentId: string) => void;
    showInlineMetadata?: boolean;
}

function getStatusIcon(status: Message["status"], isMe: boolean) {
    if (status === "READ") {
        return (
            <CheckCheck
                size={12}
                className={cn(
                    "drop-shadow-sm",
                    isMe ? "text-white/95" : "text-[#1a146b] dark:text-[#818cf8]",
                )}
            />
        );
    }
    if (status === "DELIVERED") {
        return (
            <CheckCheck
                size={12}
                className={cn(isMe ? "text-white/75" : "text-muted-foreground/60")}
            />
        );
    }
    return (
        <Check
            size={12}
            className={cn(isMe ? "text-white/75" : "text-muted-foreground/60")}
        />
    );
}

export function ImageCaptionMessageBubble({
    msg,
    isMe,
    isAgent,
    repliedMsg,
    replySenderName,
    participant,
    currentUserId,
    participantDirectory,
    highlightKeyword,
    onOpenSenderProfile,
    onOpenImage,
    showInlineMetadata = true,
}: ImageCaptionMessageBubbleProps) {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language === "vi" ? "vi-VN" : "en-US";
    const imageAttachments =
        msg.attachments?.filter((a) => a.type?.startsWith("image/")) ?? [];
    const formattedTime = new Date(msg.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return (
        <div
            className={cn(
                "overflow-hidden text-sm shadow-sm transition-all",
                isMe
                    ? "bg-[#1a146b] text-white rounded-2xl rounded-br-sm"
                    : isAgent
                      ? "bg-linear-to-br from-[#1a146b]/10 to-[#1a146b]/5 border border-[#1a146b]/30 text-foreground dark:from-[#312e81]/15 dark:to-[#312e81]/5 dark:border-[#312e81]/25 rounded-2xl rounded-bl-sm"
                      : "bg-muted/75 border border-border/60 text-foreground dark:bg-zinc-800/90 dark:border-zinc-700 rounded-2xl rounded-bl-sm",
                msg.priority === "URGENT" && "ring-2 ring-red-500/60",
                msg.priority === "IMPORTANT" && "ring-2 ring-amber-500/60",
            )}
            style={{ maxWidth: IMAGE_CAPTION_MAX_WIDTH, minWidth: IMAGE_CAPTION_MIN_WIDTH }}
        >
            {msg.priority && (
                <div
                    className={cn(
                        "flex items-center gap-1 px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide",
                        msg.priority === "URGENT" ? "text-red-500" : "text-amber-500",
                        isMe && msg.priority === "URGENT" && "text-red-200",
                        isMe && msg.priority === "IMPORTANT" && "text-amber-200",
                    )}
                >
                    {msg.priority === "URGENT" ? (
                        <AlertTriangle size={11} />
                    ) : (
                        <Star size={11} />
                    )}
                    {msg.priority}
                </div>
            )}

            {repliedMsg && (
                <div className="px-3 pt-2">
                    <ReplyPreview
                        replyMessage={repliedMsg}
                        participant={participant}
                        senderName={replySenderName}
                        currentUserId={currentUserId}
                        isMe={isMe}
                    />
                </div>
            )}

            <ImageCaptionGallery
                messageId={msg.id}
                attachments={imageAttachments}
                onOpenImage={onOpenImage}
            />

            <div className="px-3 pt-1.5 pb-2">
                <TextMessageBody
                    content={msg.content}
                    isMe={isMe}
                    participantDirectory={participantDirectory}
                    highlightKeyword={highlightKeyword}
                    onOpenSenderProfile={onOpenSenderProfile}
                />
                {msg.edited && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="ml-1.5 text-[10px] opacity-70 cursor-help">
                                {t("chat.edited")}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {msg.editedAt &&
                                t("chat.edited_at", {
                                    time: new Date(msg.editedAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" }),
                                    date: new Date(msg.editedAt).toLocaleDateString(dateLocale),
                                })}
                        </TooltipContent>
                    </Tooltip>
                )}
                {showInlineMetadata && (
                    <div
                        className={cn(
                            "mt-1 flex items-center gap-1",
                            isMe ? "justify-end" : "justify-start",
                        )}
                    >
                        <span
                            className={cn(
                                "text-[11px] font-medium",
                                isMe ? "text-white/80" : "text-muted-foreground",
                            )}
                        >
                            {formattedTime}
                        </span>
                        {isMe && getStatusIcon(msg.status, isMe)}
                    </div>
                )}
            </div>
        </div>
    );
}
