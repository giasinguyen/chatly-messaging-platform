import { useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, ChatUser } from "@/types/message";
import type { ConversationType } from "@/types/conversation";
import { ReplyPreview } from "./ReplyPreview";

interface MessageListProps {
    messages: Message[];
    participant: ChatUser;
    conversationType: ConversationType;
    participantDirectory: Record<string, ChatUser>;
    currentUserId: string;
    onReply: (msg: Message) => void;
    onLoadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
}

export function MessageList({
    messages,
    participant,
    conversationType,
    participantDirectory,
    currentUserId,
    onReply,
    onLoadMore,
    isLoadingMore,
    hasMore,
}: MessageListProps) {
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const isFirstMount = useRef(true);

    // Auto scroll to bottom only on first mount or new messages from bottom
    useEffect(() => {
        if (isFirstMount.current) {
            scrollEndRef.current?.scrollIntoView({ behavior: "instant" });
            isFirstMount.current = false;
        } else {
            scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length]);

    // Restore scroll position after loading more messages at top
    useEffect(() => {
        if (
            !isLoadingMore &&
            containerRef.current &&
            prevScrollHeightRef.current > 0
        ) {
            const newScrollHeight = containerRef.current.scrollHeight;
            containerRef.current.scrollTop =
                newScrollHeight - prevScrollHeightRef.current;
            prevScrollHeightRef.current = 0;
        }
    }, [isLoadingMore, messages]);

    // IntersectionObserver for lazy load
    const handleSentinelIntersect = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const entry = entries[0];
            if (entry.isIntersecting && hasMore && !isLoadingMore) {
                if (containerRef.current) {
                    prevScrollHeightRef.current =
                        containerRef.current.scrollHeight;
                }
                onLoadMore();
            }
        },
        [hasMore, isLoadingMore, onLoadMore],
    );

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(handleSentinelIntersect, {
            root: containerRef.current,
            threshold: 0.1,
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [handleSentinelIntersect]);

    const getStatusIcon = (status: Message["status"]) => {
        if (status === "READ")
            return <CheckCheck size={12} className="text-brand" />;
        if (status === "DELIVERED")
            return (
                <CheckCheck size={12} className="text-muted-foreground/60" />
            );
        return <Check size={12} className="text-muted-foreground/60" />;
    };

    const TIME_GAP_THRESHOLD = 10 * 60 * 1000; // 10 minutes

    const shouldShowAvatar = (currentMsg: Message, index: number): boolean => {
        if (index === 0) return true; // Always show for first message
        const prevMsg = messages[index - 1];
        if (!prevMsg) return true;

        // Show avatar if sender changed
        if (prevMsg.senderId !== currentMsg.senderId) return true;

        // Show avatar if time gap >= 10 minutes
        const timeDiff = new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
        return timeDiff >= TIME_GAP_THRESHOLD;
    };

    const isLastInGroup = (currentMsg: Message, index: number): boolean => {
        const nextMsg = messages[index + 1];
        if (!nextMsg) return true; // Last message overall

        // Next message from different sender = last in group
        if (nextMsg.senderId !== currentMsg.senderId) return true;

        // Next message too far away = last in group
        const timeDiff = new Date(nextMsg.createdAt).getTime() - new Date(currentMsg.createdAt).getTime();
        return timeDiff >= TIME_GAP_THRESHOLD;
    };

    const renderTimeSeparator = (msg: Message, index: number) => {
        if (index === 0) return null;
        const prevMsg = messages[index - 1];
        if (!prevMsg) return null;

        const timeDiff = new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
        if (timeDiff < TIME_GAP_THRESHOLD) return null;

        return (
            <div key={`time-sep-${msg.id}`} className="flex items-center gap-3 px-4 py-2">
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    {new Date(msg.createdAt).toLocaleTimeString(
                        "vi-VN",
                        { hour: "2-digit", minute: "2-digit" },
                    )}
                </span>
                <div className="flex-1 h-px bg-border/30" />
            </div>
        );
    };

    const renderMessage = (msg: Message, index: number) => {
        const isMe = msg.senderId === currentUserId;
        const sender = participantDirectory[msg.senderId] ?? participant;
        const senderShortName = sender.displayName.split(" ").slice(-1)[0] || "Người dùng";
        const repliedMsg = msg.replyToId
            ? messages.find((m) => m.id === msg.replyToId)
            : null;
        const replySenderName = repliedMsg
            ? repliedMsg.senderId === currentUserId
                ? "Bạn"
                : (
                      participantDirectory[repliedMsg.senderId]?.displayName ||
                      participant.displayName
                  )
                      .split(" ")
                      .slice(-1)[0]
            : undefined;

        return (
            <div
                key={msg.id}
                className={cn(
                    "flex gap-2 group px-4",
                    isLastInGroup(msg, index) ? "mb-3" : "mb-0.5",
                    isMe ? "flex-row-reverse" : "flex-row",
                )}
            >
                {!isMe && shouldShowAvatar(msg, index) && (
                    <Avatar className="h-8 w-8 align-bottom border border-border/30 shrink-0">
                        <AvatarImage src={sender.avatarUrl} />
                        <AvatarFallback>
                            {sender.displayName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                )}
                {!isMe && !shouldShowAvatar(msg, index) && (
                    <div className="h-8 w-8 shrink-0" />
                )}

                <div
                    className={cn(
                        "flex flex-col max-w-[70%]",
                        isMe ? "items-end" : "items-start",
                    )}
                >
                    {!isMe && conversationType === "GROUP" && shouldShowAvatar(msg, index) && (
                        <span className="text-[11px] text-muted-foreground mb-1 px-1">
                            {senderShortName}
                        </span>
                    )}

                    {/* Bubble + Reply button */}
                    <div
                        className={cn(
                            "flex items-end gap-1",
                            isMe ? "flex-row-reverse" : "flex-row",
                        )}
                    >
                        {/* Bubble */}
                        <div
                            className={cn(
                                "px-3 py-2 text-sm shadow-sm transition-all",
                                isMe
                                    ? cn(
                                        "bg-brand text-white rounded-2xl",
                                    )
                                    : cn(
                                        "bg-muted/75 border border-border/60 text-foreground dark:bg-zinc-800/90 dark:border-zinc-700 rounded-2xl",
                                    ),
                            )}
                        >
                            {repliedMsg && (
                                <ReplyPreview
                                    replyMessage={repliedMsg}
                                    participant={participant}
                                    senderName={replySenderName}
                                    currentUserId={currentUserId}
                                    isMe={isMe}
                                />
                            )}
                            {msg.content}
                        </div>

                        {/* Reply button (on hover) */}
                        <button
                            onClick={() => onReply(msg)}
                            className={cn(
                                "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0",
                            )}
                            title="Reply"
                        >
                            <Reply size={14} />
                        </button>
                    </div>

                    {/* Time + status - show only on last message in group */}
                    {isLastInGroup(msg, index) && (
                        <div
                            className={cn(
                                "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1",
                                isMe ? "flex-row-reverse" : "flex-row",
                            )}
                        >
                            <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleTimeString(
                                    "vi-VN",
                                    { hour: "2-digit", minute: "2-digit" },
                                )}
                            </span>
                            {isMe && <span>{getStatusIcon(msg.status)}</span>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto bg-muted/20">
            <div className="py-6 flex flex-col min-h-full">
                {/* Lazy load sentinel */}
                <div
                    ref={sentinelRef}
                    className="flex justify-center h-8 items-center"
                >
                    {isLoadingMore && (
                        <span className="text-[11px] text-muted-foreground animate-pulse">
                            Đang tải tin nhắn cũ hơn...
                        </span>
                    )}
                    {!isLoadingMore && hasMore && (
                        <span className="text-[11px] text-muted-foreground/50">
                            ↑ Kéo lên để xem thêm
                        </span>
                    )}
                </div>

                {messages.map((msg, index) => (
                    <div key={`msg-group-${msg.id}`}>
                        {renderTimeSeparator(msg, index)}
                        {renderMessage(msg, index)}
                    </div>
                ))}
                <div ref={scrollEndRef} />
            </div>
        </div>
    );
}
