import { useCallback, useMemo, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Message, ChatUser } from "@/types/message";
import type { ConversationType } from "@/types/conversation";
import type { ContactResponse } from "@/types/contact";
import { MessageBubbleContainer } from "./MessageBubbleContainer";
import { CallMessageRenderer } from "./CallMessageRenderer";
import { ImageLightbox } from "./ImageLightbox";
import { FailedMessageList } from "./FailedMessageList";
import { MessageConfirmDialogs } from "./MessageConfirmDialogs";
import { useMessageListScroll } from "./useMessageListScroll";
import {
    collectImageAttachments,
    TIME_GAP_THRESHOLD,
    type FailedMessageItem,
} from "./messageList.utils";

interface MessageListProps {
    messages: Message[];
    participant: ChatUser;
    conversationType: ConversationType;
    participantDirectory: Record<string, ChatUser>;
    currentUserId: string;
    onReply: (msg: Message) => void;
    onForward: (msg: Message) => void;
    onRecall: (messageId: string) => void;
    onEdit: (messageId: string, newContent: string) => void;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onOpenSenderProfile?: (userId: string) => void;
    onLoadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
    failedMessages?: FailedMessageItem[];
    onRetryMessage?: (id: string) => void;
    onRemoveFailedMessage?: (id: string) => void;
    highlightedMessageId?: string | null;
    highlightKeyword?: string | null;
    onVotePoll?: (messageId: string, optionIndex: number) => void;
    onClosePoll?: (messageId: string) => void;
    onTogglePin?: (messageId: string) => void;
    onCallAgain?: (calleeId: string, calleeName: string, calleeAvatar?: string) => void;
    onJoinGroupCall?: (callId: string) => void;
    onTagPriority?: (messageId: string, priority: string) => void;
    contacts?: ContactResponse[];
    onAddFriend?: (userId: string) => void;
}

export function MessageList({
    messages,
    participant,
    conversationType,
    participantDirectory,
    currentUserId,
    onReply,
    onForward,
    onRecall,
    onEdit,
    onDelete,
    onReact,
    onOpenSenderProfile,
    onLoadMore,
    isLoadingMore,
    hasMore,
    failedMessages = [],
    onRetryMessage,
    onRemoveFailedMessage,
    highlightedMessageId,
    highlightKeyword,
    onVotePoll,
    onClosePoll,
    onTogglePin,
    onCallAgain,
    onJoinGroupCall,
    onTagPriority,
    contacts = [],
    onAddFriend,
}: MessageListProps) {
    const { containerRef, sentinelRef, scrollEndRef } = useMessageListScroll({
        messageCount: messages.length,
        isLoadingMore,
        hasMore,
        onLoadMore,
        highlightedMessageId,
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");
    const [recallConfirmId, setRecallConfirmId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const allImages = useMemo(() => collectImageAttachments(messages), [messages]);

    const lastSeenByOthersIdx = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (
                msg.senderId === currentUserId &&
                !msg.recalled &&
                msg.readBy &&
                msg.readBy.some((r) => r.userId !== currentUserId)
            ) {
                return i;
            }
        }
        return -1;
    }, [messages, currentUserId]);

    const handleStartEdit = useCallback((msg: Message) => {
        setEditingId(msg.id);
        setEditDraft(msg.content);
    }, []);
    const handleCommitEdit = useCallback(() => {
        if (editingId && editDraft.trim()) {
            onEdit(editingId, editDraft.trim());
        }
        setEditingId(null);
        setEditDraft("");
    }, [editingId, editDraft, onEdit]);
    const handleCancelEdit = useCallback(() => {
        setEditingId(null);
        setEditDraft("");
    }, []);

    const handleOpenImage = useCallback(
        (attachmentId: string) => {
            const idx = allImages.findIndex((img) => img.id === attachmentId);
            if (idx >= 0) setLightboxIndex(idx);
        },
        [allImages],
    );

    const renderTimeSeparator = (msg: Message, index: number) => {
        if (index === 0) return null;
        const prevMsg = messages[index - 1];
        if (!prevMsg) return null;
        const timeDiff =
            new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
        if (timeDiff < TIME_GAP_THRESHOLD) return null;
        return (
            <div key={`time-sep-${msg.id}`} className="px-4 py-2 text-center">
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </span>
            </div>
        );
    };

    const renderMessage = (msg: Message, index: number) => {
        if (msg.type === "CALL") {
            return (
                <CallMessageRenderer
                    key={msg.id}
                    msg={msg}
                    messages={messages}
                    currentUserId={currentUserId}
                    participant={participant}
                    participantDirectory={participantDirectory}
                    conversationType={conversationType}
                    onCallAgain={onCallAgain}
                    onJoinGroupCall={onJoinGroupCall}
                />
            );
        }
        return (
            <MessageBubbleContainer
                msg={msg}
                messages={messages}
                index={index}
                currentUserId={currentUserId}
                participant={participant}
                participantDirectory={participantDirectory}
                conversationType={conversationType}
                contacts={contacts}
                highlightKeyword={highlightKeyword}
                lastSeenByOthersIdx={lastSeenByOthersIdx}
                editingId={editingId}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                onStartEdit={handleStartEdit}
                onCommitEdit={handleCommitEdit}
                onCancelEdit={handleCancelEdit}
                onReply={onReply}
                onForward={onForward}
                onReact={onReact}
                onOpenSenderProfile={onOpenSenderProfile}
                onVotePoll={onVotePoll}
                onClosePoll={onClosePoll}
                onTogglePin={onTogglePin}
                onTagPriority={onTagPriority}
                onAddFriend={onAddFriend}
                onOpenImage={handleOpenImage}
                onRequestRecall={setRecallConfirmId}
                onRequestDelete={setDeleteConfirmId}
            />
        );
    };

    const handleConfirmRecall = (id: string) => {
        onRecall(id);
        setRecallConfirmId(null);
    };
    const handleConfirmDelete = (id: string) => {
        onDelete(id);
        setDeleteConfirmId(null);
    };

    return (
        <TooltipProvider>
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto bg-muted/20 hide-scrollbar"
            >
                <div className="py-6 flex flex-col min-h-full">
                    <div
                        ref={sentinelRef}
                        className="flex justify-center h-8 items-center"
                    >
                        {isLoadingMore && (
                            <span className="text-[11px] text-muted-foreground animate-pulse">
                                Loading older messages...
                            </span>
                        )}
                        {!isLoadingMore && hasMore && (
                            <span className="text-[11px] text-muted-foreground/50">
                                Γåæ Pull up to see more
                            </span>
                        )}
                    </div>

                    {messages.map((msg, index) => (
                        <div key={`msg-group-${msg.id}-${index}`}>
                            {renderTimeSeparator(msg, index)}
                            {renderMessage(msg, index)}
                        </div>
                    ))}

                    <FailedMessageList
                        failedMessages={failedMessages}
                        onRetryMessage={onRetryMessage}
                        onRemoveFailedMessage={onRemoveFailedMessage}
                    />

                    <div ref={scrollEndRef} />
                </div>
            </div>

            <MessageConfirmDialogs
                recallConfirmId={recallConfirmId}
                deleteConfirmId={deleteConfirmId}
                onCancelRecall={() => setRecallConfirmId(null)}
                onCancelDelete={() => setDeleteConfirmId(null)}
                onConfirmRecall={handleConfirmRecall}
                onConfirmDelete={handleConfirmDelete}
            />

            {lightboxIndex !== null && (
                <ImageLightbox
                    images={allImages}
                    index={lightboxIndex}
                    onIndexChange={setLightboxIndex}
                />
            )}
        </TooltipProvider>
    );
}
