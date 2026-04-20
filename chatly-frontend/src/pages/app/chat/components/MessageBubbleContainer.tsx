import { Check, CheckCheck, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Message, ChatUser } from "@/types/message";
import type { ConversationType } from "@/types/conversation";
import type { ContactResponse } from "@/types/contact";
import { MessageBubbleBody } from "./MessageBubbleBody";
import { MessageBubbleActions } from "./MessageBubbleActions";
import { MessageSeenIndicator } from "./MessageSeenIndicator";
import { MessageContextMenu } from "./MessageContextMenu";
import { isLastInGroup, shouldShowAvatar } from "./messageList.utils";

interface MessageBubbleContainerProps {
    msg: Message;
    messages: Message[];
    index: number;
    currentUserId: string;
    participant: ChatUser;
    participantDirectory: Record<string, ChatUser>;
    conversationType: ConversationType;
    contacts: ContactResponse[];
    highlightKeyword?: string | null;
    lastSeenByOthersIdx: number;
    editingId: string | null;
    editPlainDraft: string;
    setEditPlainDraft: (value: string) => void;
    editHtmlDraft: string;
    setEditRichDraft: (nextHtml: string, nextText: string) => void;
    isEditingRichText: boolean;
    onStartEdit: (msg: Message) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    onReply: (msg: Message) => void;
    onForward: (msg: Message) => void;
    onReact: (messageId: string, emoji: string) => void;
    onOpenSenderProfile?: (userId: string) => void;
    onVotePoll?: (messageId: string, optionIndex: number) => void;
    onClosePoll?: (messageId: string) => void;
    onTogglePin?: (messageId: string) => void;
    onTagPriority?: (messageId: string, priority: string) => void;
    onAddFriend?: (userId: string) => void;
    onOpenImage: (attachmentId: string) => void;
    onRequestRecall: (messageId: string) => void;
    onRequestDelete: (messageId: string) => void;
}

function getStatusIcon(status: Message["status"]) {
    if (status === "READ") return <CheckCheck size={12} className="text-brand" />;
    if (status === "DELIVERED")
        return <CheckCheck size={12} className="text-muted-foreground/60" />;
    return <Check size={12} className="text-muted-foreground/60" />;
}

export function MessageBubbleContainer(props: MessageBubbleContainerProps) {
    const {
        msg,
        messages,
        index,
        currentUserId,
        participant,
        participantDirectory,
        conversationType,
        contacts,
        highlightKeyword,
        lastSeenByOthersIdx,
        editingId,
        editPlainDraft,
        setEditPlainDraft,
        editHtmlDraft,
        setEditRichDraft,
        isEditingRichText,
        onStartEdit,
        onCommitEdit,
        onCancelEdit,
        onReply,
        onForward,
        onReact,
        onOpenSenderProfile,
        onVotePoll,
        onClosePoll,
        onTogglePin,
        onTagPriority,
        onAddFriend,
        onOpenImage,
        onRequestRecall,
        onRequestDelete,
    } = props;

    if (msg.type === "SYSTEM") {
        return (
            <div className="flex justify-center my-2 px-4">
                <div className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-zinc-800/60 border border-border/40 rounded-full px-3.5 py-1.5 max-w-[85%]">
                    <span className="text-xs text-muted-foreground text-center">
                        {msg.content}
                    </span>
                </div>
            </div>
        );
    }

    const isMe = msg.senderId === currentUserId;
    const sender = participantDirectory[msg.senderId] ?? participant;
    const senderShortName = sender.displayName.split(" ").slice(-1)[0] || "User";
    const repliedMsg = msg.replyToId
        ? messages.find((m) => m.id === msg.replyToId) ?? null
        : null;
    const replySenderName = repliedMsg
        ? repliedMsg.senderId === currentUserId
            ? "You"
            : (
                  participantDirectory[repliedMsg.senderId]?.displayName ||
                  participant.displayName
              )
                  .split(" ")
                  .slice(-1)[0]
        : undefined;
    const isBeingEdited = editingId === msg.id;
    const isPoll = msg.type === "POLL";
    const showAvatar = shouldShowAvatar(messages, index);
    const lastInGroup = isLastInGroup(messages, index);

    const bubble = (
        <div
            data-message-id={msg.id}
            className={cn(
                "flex gap-2 group px-4 transition-colors duration-500",
                lastInGroup ? "mb-3" : "mb-0.5",
                isPoll ? "justify-center" : isMe ? "flex-row-reverse" : "flex-row",
            )}
        >
            {!isMe && !isPoll && showAvatar && (
                <button
                    type="button"
                    onClick={() => onOpenSenderProfile?.(msg.senderId)}
                    className="shrink-0"
                    title="View user info"
                >
                    <Avatar className="h-8 w-8 align-bottom border border-border/30 shrink-0">
                        <AvatarImage src={sender.avatarUrl} />
                        <AvatarFallback>{sender.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                </button>
            )}
            {!isMe && !isPoll && !showAvatar && <div className="h-8 w-8 shrink-0" />}

            <div
                className={cn(
                    "flex flex-col",
                    !isPoll && "max-w-[70%]",
                    isPoll ? "items-center" : isMe ? "items-end" : "items-start",
                )}
            >
                {!isMe && !isPoll && conversationType === "GROUP" && showAvatar && (
                    <button
                        type="button"
                        onClick={() => onOpenSenderProfile?.(msg.senderId)}
                        className="text-[11px] text-muted-foreground mb-1 px-1 hover:text-foreground transition-colors"
                        title="View user info"
                    >
                        {senderShortName}
                    </button>
                )}

                {msg.pinned && (
                    <div
                        className={cn(
                            "flex items-center gap-1 px-1 mb-0.5",
                            isPoll ? "justify-center" : isMe ? "justify-end" : "justify-start",
                        )}
                    >
                        <Pin size={10} className="text-amber-500" />
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                            Pinned
                        </span>
                    </div>
                )}

                <div
                    className={cn(
                        "flex items-end gap-1",
                        isPoll
                            ? "flex-row justify-center"
                            : isMe
                            ? "flex-row-reverse"
                            : "flex-row",
                    )}
                >
                    <MessageBubbleBody
                        msg={msg}
                        repliedMsg={repliedMsg}
                        replySenderName={replySenderName}
                        isMe={isMe}
                        isBeingEdited={isBeingEdited}
                        editPlainDraft={editPlainDraft}
                        setEditPlainDraft={setEditPlainDraft}
                        editHtmlDraft={editHtmlDraft}
                        setEditRichDraft={setEditRichDraft}
                        isEditingRichText={isEditingRichText}
                        onCommitEdit={onCommitEdit}
                        onCancelEdit={onCancelEdit}
                        currentUserId={currentUserId}
                        participant={participant}
                        participantDirectory={participantDirectory}
                        contacts={contacts}
                        highlightKeyword={highlightKeyword}
                        onOpenSenderProfile={onOpenSenderProfile}
                        onVotePoll={onVotePoll}
                        onClosePoll={onClosePoll}
                        onAddFriend={onAddFriend}
                        onOpenImage={onOpenImage}
                    />

                    {!msg.recalled && !isBeingEdited && (
                        <MessageBubbleActions
                            msg={msg}
                            isMe={isMe}
                            onReply={onReply}
                            onReact={onReact}
                        />
                    )}
                </div>

                {msg.reactions && msg.reactions.length > 0 && (
                    <div
                        className={cn(
                            "flex flex-wrap gap-1 mt-0.5 px-1",
                            isMe ? "justify-end" : "justify-start",
                        )}
                    >
                        {Object.entries(
                            msg.reactions.reduce<Record<string, string[]>>((acc, r) => {
                                (acc[r.emoji] ??= []).push(r.userId);
                                return acc;
                            }, {}),
                        ).map(([emoji, userIds]) => (
                            <button
                                key={emoji}
                                onClick={() => onReact(msg.id, emoji)}
                                className={cn(
                                    "flex items-center gap-0.5 text-xs rounded-full px-1.5 py-0.5 border transition-colors",
                                    userIds.includes(currentUserId)
                                        ? "bg-brand/10 border-brand/40 text-brand"
                                        : "bg-muted/60 border-border/50 text-muted-foreground hover:bg-muted",
                                )}
                            >
                                <span>{emoji}</span>
                                {userIds.length > 1 && <span>{userIds.length}</span>}
                            </button>
                        ))}
                    </div>
                )}

                {lastInGroup && (
                    <div
                        className={cn(
                            "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1",
                            isMe ? "flex-row-reverse" : "flex-row",
                        )}
                    >
                        <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                        {isMe && !msg.recalled && <span>{getStatusIcon(msg.status)}</span>}
                    </div>
                )}

                {isMe && index === lastSeenByOthersIdx && !msg.recalled && (
                    <MessageSeenIndicator
                        msg={msg}
                        currentUserId={currentUserId}
                        participantDirectory={participantDirectory}
                        conversationType={conversationType}
                    />
                )}
            </div>
        </div>
    );

    if (isBeingEdited) return bubble;

    return (
        <MessageContextMenu
            msg={msg}
            currentUserId={currentUserId}
            onReply={onReply}
            onForward={onForward}
            onStartEdit={onStartEdit}
            onRequestRecall={onRequestRecall}
            onRequestDelete={onRequestDelete}
            onTogglePin={onTogglePin}
            onTagPriority={onTagPriority}
        >
            {bubble}
        </MessageContextMenu>
    );
}
