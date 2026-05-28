import { type ChangeEvent, type KeyboardEvent } from "react";
import {
    RotateCcw,
    Send,
    X,
    Star,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Message, ChatUser, Poll } from "@/types/message";
import type { ContactResponse } from "@/types/contact";
import { ReplyPreview } from "./ReplyPreview";
import { PollMessageRenderer } from "./PollMessageRenderer";
import { VCardMessageRenderer } from "./VCardMessageRenderer";
import { LocationMessageRenderer } from "./LocationMessageRenderer";
import { TextMessageBody } from "./TextMessageBody";
import { MessageAttachmentRenderer } from "./MessageAttachmentRenderer";
import { ImageCaptionMessageBubble } from "./ImageCaptionMessageBubble";
import { AudioMessagePlayer } from "@/components/AudioMessagePlayer";
import { RichTextMessageEditor } from "./RichTextMessageEditor";
import { isRichTextHtml } from "./richTextMessage.utils";
import { isImageCaptionMessage } from "./messageList.utils";

interface MessageBubbleBodyProps {
    msg: Message;
    repliedMsg: Message | null;
    replySenderName?: string;
    isMe: boolean;
    isAgent: boolean;
    isBeingEdited: boolean;
    editPlainDraft: string;
    setEditPlainDraft: (value: string) => void;
    editHtmlDraft: string;
    setEditRichDraft: (nextHtml: string, nextText: string) => void;
    isEditingRichText: boolean;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    currentUserId: string;
    participant: ChatUser;
    participantDirectory: Record<string, ChatUser>;
    contacts: ContactResponse[];
    highlightKeyword?: string | null;
    onOpenSenderProfile?: (userId: string) => void;
    onVotePoll?: (messageId: string, optionIndex: number) => void;
    onClosePoll?: (messageId: string) => void;
    onAddFriend?: (userId: string) => void;
    onOpenImage: (attachmentId: string) => void;
    showInlineMetadata?: boolean;
}

export function MessageBubbleBody(props: MessageBubbleBodyProps) {
    const {
        msg,
        repliedMsg,
        replySenderName,
        isMe,
        isAgent,
        isBeingEdited,
        editPlainDraft,
        setEditPlainDraft,
        setEditRichDraft,
        isEditingRichText,
        onCommitEdit,
        onCancelEdit,
        currentUserId,
        participant,
        participantDirectory,
        contacts,
        highlightKeyword,
        onOpenSenderProfile,
        onVotePoll,
        onClosePoll,
        onAddFriend,
        onOpenImage,
        showInlineMetadata = false,
    } = props;

    if (msg.recalled) {
        return (
            <div
                className={cn(
                    "px-3 py-2 text-sm rounded-2xl border italic text-muted-foreground",
                    isMe
                        ? "bg-[#1a146b]/10 border-[#1a146b]/20"
                        : "bg-muted/40 border-border/40 dark:bg-zinc-800/50 dark:border-zinc-700/50",
                )}
            >
                <RotateCcw size={12} className="inline mr-1.5 opacity-60" />
                Message recalled
            </div>
        );
    }

    if (isBeingEdited) {
        const shouldUseRichEditor = isEditingRichText || isRichTextHtml(msg.content);
        const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onCommitEdit();
            }
            if (e.key === "Escape") onCancelEdit();
        };
        const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
            setEditPlainDraft(e.target.value);

        return (
            <div className="flex flex-col gap-2 min-w-70 max-w-xl">
                {shouldUseRichEditor ? (
                    <RichTextMessageEditor
                        key={`edit-${msg.id}`}
                        initialHtml={msg.content}
                        onChange={setEditRichDraft}
                        onSend={onCommitEdit}
                        mode="editor"
                    />
                ) : (
                    <div className="flex items-center gap-1">
                        <Input
                            autoFocus
                            value={editPlainDraft}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            className="h-8 text-sm min-w-50 max-w-xs"
                        />
                    </div>
                )}
                <div className="flex items-center gap-1 self-end">
                    <button
                        onClick={onCommitEdit}
                        className="p-1.5 rounded-full bg-[#1a146b] text-white hover:bg-[#312e81] shrink-0"
                        title="Save"
                    >
                        <Send size={12} />
                    </button>
                    <button
                        onClick={onCancelEdit}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground shrink-0"
                        title="Cancel"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
        );
    }

    if (msg.type === "POLL" && msg.poll) {
        return (
            <PollMessageRenderer
                msg={msg as Message & { poll: Poll }}
                currentUserId={currentUserId}
                participantDirectory={participantDirectory}
                isMe={isMe}
                onVotePoll={onVotePoll}
                onClosePoll={onClosePoll}
            />
        );
    }

    if (msg.type === "GIF" || msg.type === "STICKER") {
        return (
            <div>
                {repliedMsg && (
                    <div
                        className={cn(
                            "px-3 py-1.5 mb-1 rounded-xl text-sm",
                            isMe
                                ? "bg-[#1a146b]/10 border border-[#1a146b]/20"
                                : "bg-muted/50 border border-border/40",
                        )}
                    >
                        <ReplyPreview
                            replyMessage={repliedMsg}
                            participant={participant}
                            senderName={replySenderName}
                            currentUserId={currentUserId}
                            isMe={isMe}
                        />
                    </div>
                )}
                <img
                    src={msg.content}
                    alt={msg.type === "GIF" ? "GIF" : "Sticker"}
                    loading="lazy"
                    className={cn(
                        "rounded-xl object-contain",
                        msg.type === "GIF" ? "max-w-60 max-h-50" : "w-35 h-auto",
                    )}
                />
            </div>
        );
    }

    if (msg.type === "VCARD") {
        return (
            <VCardMessageRenderer
                content={msg.content}
                contacts={contacts}
                currentUserId={currentUserId}
                onAddFriend={onAddFriend}
                onOpenSenderProfile={onOpenSenderProfile}
            />
        );
    }

    if (msg.type === "LOCATION" && msg.location) {
        return <LocationMessageRenderer location={msg.location} />;
    }

    if (msg.type === "AUDIO") {
        const audio = msg.attachments?.[0];
        if (!audio?.url) return null;
        return (
            <AudioMessagePlayer
                url={audio.url}
                name={audio.name}
                durationSeconds={audio.durationSeconds}
                isMe={isMe}
            />
        );
    }

    const hasOnlyImages =
        msg.attachments &&
        msg.attachments.length > 0 &&
        !msg.content &&
        msg.attachments.every((a) => a.type?.startsWith("image/"));

    const hasSpecialAttachment =
        msg.attachments &&
        msg.attachments.length > 0 &&
        msg.attachments.some(
            (a) => {
                const isPostOrReel =
                    a.kind === "POST_PREVIEW" ||
                    a.kind === "REEL_PREVIEW" ||
                    a.type === "application/x-chatly-post-preview" ||
                    a.type === "application/x-chatly-reel-preview" ||
                    Boolean(a.postId) ||
                    Boolean(a.reelId);

                if (isPostOrReel) {
                    return !msg.content || msg.content === "Shared a post" || msg.content === "Shared a reel";
                }

                return !msg.content && a.kind === "STORY_REPLY";
            }
        );

    if (isImageCaptionMessage(msg)) {
        return (
            <ImageCaptionMessageBubble
                msg={msg}
                isMe={isMe}
                isAgent={isAgent}
                repliedMsg={repliedMsg}
                replySenderName={replySenderName}
                participant={participant}
                currentUserId={currentUserId}
                participantDirectory={participantDirectory}
                highlightKeyword={highlightKeyword}
                onOpenSenderProfile={onOpenSenderProfile}
                onOpenImage={onOpenImage}
                showInlineMetadata={showInlineMetadata}
            />
        );
    }

    if (hasOnlyImages || hasSpecialAttachment) {
        return (
            <div className="flex flex-col gap-1.5">
                {repliedMsg && (
                    <div
                        className={cn(
                            "px-3 py-1.5 mb-1 rounded-xl text-sm",
                            isMe
                                ? "bg-[#1a146b]/10 border border-[#1a146b]/20"
                                : "bg-muted/50 border border-border/40",
                        )}
                    >
                        <ReplyPreview
                            replyMessage={repliedMsg}
                            participant={participant}
                            senderName={replySenderName}
                            currentUserId={currentUserId}
                            isMe={isMe}
                        />
                    </div>
                )}
                <MessageAttachmentRenderer
                    messageId={msg.id}
                    attachments={msg.attachments || []}
                    hasContent={false}
                    isMe={isMe}
                    onOpenImage={onOpenImage}
                />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "px-3 py-2 text-sm shadow-sm transition-all",
                isMe
                    ? "bg-[#1a146b] text-white rounded-2xl rounded-br-sm"
                    : isAgent
                      ? "bg-linear-to-br from-[#1a146b]/10 to-[#1a146b]/5 border border-[#1a146b]/30 text-foreground dark:from-[#312e81]/15 dark:to-[#312e81]/5 dark:border-[#312e81]/25 rounded-2xl rounded-bl-sm"
                      : "bg-muted/75 border border-border/60 text-foreground dark:bg-zinc-800/90 dark:border-zinc-700 rounded-2xl rounded-bl-sm",
                msg.priority === "URGENT" && "ring-2 ring-red-500/60",
                msg.priority === "IMPORTANT" && "ring-2 ring-amber-500/60",
            )}
        >
            {msg.priority && (
                <div
                    className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold mb-1 uppercase tracking-wide",
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
                <ReplyPreview
                    replyMessage={repliedMsg}
                    participant={participant}
                    senderName={replySenderName}
                    currentUserId={currentUserId}
                    isMe={isMe}
                />
            )}
            {msg.attachments?.some((a) => a.kind === "STORY_REPLY") && (
                <MessageAttachmentRenderer
                    messageId={msg.id}
                    attachments={msg.attachments}
                    hasContent={false}
                    isMe={isMe}
                    onOpenImage={onOpenImage}
                />
            )}
            <TextMessageBody
                content={msg.content}
                isMe={isMe}
                participantDirectory={participantDirectory}
                highlightKeyword={highlightKeyword}
                onOpenSenderProfile={onOpenSenderProfile}
            />
            {!msg.attachments?.some((a) => a.kind === "STORY_REPLY") && (
                <MessageAttachmentRenderer
                    messageId={msg.id}
                    attachments={msg.attachments}
                    hasContent={!!msg.content}
                    isMe={isMe}
                    onOpenImage={onOpenImage}
                />
            )}
            {msg.edited && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="ml-1.5 text-[10px] opacity-70 cursor-help">
                            (edited)
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        {msg.editedAt &&
                            `Edited at: ${new Date(msg.editedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}, ${new Date(msg.editedAt).toLocaleDateString("en-US")}`}
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
