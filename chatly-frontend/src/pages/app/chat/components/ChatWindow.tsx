import { useState, useCallback } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { chatList, mockMessages, mockMessagesPage2 } from "@/mocks/chat";
import type { Message } from "@/mocks/chat";

interface ChatWindowProps {
    id: string;
}

export function ChatWindow({ id }: ChatWindowProps) {
    const chat = chatList.find((c) => c.id === id);

    const [messages, setMessages] = useState<Message[]>(mockMessages[id] ?? []);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(!!mockMessagesPage2[id]?.length);

    const handleReply = useCallback((msg: Message) => {
        setReplyingTo(msg);
    }, []);

    const handleCancelReply = useCallback(() => {
        setReplyingTo(null);
    }, []);

    const handleLoadMore = useCallback(() => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);

        // Simulate network delay
        setTimeout(() => {
            const olderMessages = mockMessagesPage2[id] ?? [];
            setMessages((prev) => [...olderMessages, ...prev]);
            setHasMore(false);
            setIsLoadingMore(false);
        }, 800);
    }, [id, hasMore, isLoadingMore]);

    if (!chat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground">
                Hội thoại không tồn tại
            </div>
        );
    }

    const replyingSenderName =
        replyingTo?.senderId === "me"
            ? "Bạn"
            : chat.user.name.split(" ").slice(-1)[0];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
            <ChatHeader user={chat.user} isFriend={chat.isFriend} />

            <MessageList
                messages={messages}
                participant={chat.user}
                onReply={handleReply}
                onLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
            />

            <ChatInput
                replyingTo={replyingTo}
                senderName={replyingSenderName}
                onCancelReply={handleCancelReply}
            />
        </div>
    );
}
