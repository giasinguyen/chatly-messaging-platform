import { useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, ChatUser } from "@/types/message";
import { ReplyPreview } from "./ReplyPreview";

interface MessageListProps {
    messages: Message[];
    participant: ChatUser;
    currentUserId: string;
    onReply: (msg: Message) => void;
    onLoadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
}

export function MessageList({
    messages,
    participant,
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

    const renderMessage = (msg: Message) => {
        const isMe = msg.senderId === currentUserId;
        const repliedMsg = msg.replyToId
            ? messages.find((m) => m.id === msg.replyToId)
            : null;

        return (
            <div
                key={msg.id}
                className={cn(
                    "flex gap-2 mb-4 group px-4",
                    isMe ? "flex-row-reverse" : "flex-row",
                )}
            >
                {!isMe && (
                    <Avatar className="h-8 w-8 align-bottom border border-border/30 shrink-0">
                        <AvatarImage src={participant.avatarUrl} />
                        <AvatarFallback>
                            {participant.displayName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                )}

                <div
                    className={cn(
                        "flex flex-col max-w-[70%]",
                        isMe ? "items-end" : "items-start",
                    )}
                >
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
                                "px-3 py-2 rounded-2xl text-sm shadow-sm transition-all",
                                isMe
                                    ? "bg-brand text-white rounded-br-none"
                                    : "bg-muted/75 border border-border/60 rounded-bl-none text-foreground dark:bg-zinc-800/90 dark:border-zinc-700",
                            )}
                        >
                            {repliedMsg && (
                                <ReplyPreview
                                    replyMessage={repliedMsg}
                                    participant={participant}
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

                    {/* Time + status */}
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

                {messages.map(renderMessage)}
                <div ref={scrollEndRef} />
            </div>
        </div>
    );
}
