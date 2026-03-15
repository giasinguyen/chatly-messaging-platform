import { useEffect, useCallback } from "react";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import type { Message } from "@/types/message";

interface TypingData {
    userId: string;
    typing: boolean;
}

interface UseChatSocketProps {
    conversationId: string;
    onMessage: (message: Message) => void;
    onTyping: (data: TypingData) => void;
    onRead: (message: Message) => void;
}

export function useChatSocket({
    conversationId,
    onMessage,
    onTyping,
    onRead,
}: UseChatSocketProps) {
    const { user } = useAuthStore();

    useEffect(() => {
        if (!conversationId || !user) return;

        let isMounted = true;

        const setup = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            await socketService.connect(token);
            const client = socketService.getClient();

            if (!client || !isMounted) return;

            // 1. Subscribe to new messages
            const messageSub = client.subscribe(
                `/topic/conversation.${conversationId}`,
                (payload) => {
                    const msg = JSON.parse(payload.body);
                    onMessage(msg);
                }
            );

            // 2. Subscribe to typing indicators
            const typingSub = client.subscribe(
                `/topic/conversation.${conversationId}.typing`,
                (payload) => {
                    const data = JSON.parse(payload.body);
                    onTyping(data);
                }
            );

            // 3. Subscribe to read receipts
            const readSub = client.subscribe(
                `/topic/conversation.${conversationId}.read`,
                (payload) => {
                    const msg = JSON.parse(payload.body);
                    onRead(msg);
                }
            );

            return () => {
                messageSub.unsubscribe();
                typingSub.unsubscribe();
                readSub.unsubscribe();
            };
        };

        const cleanupPromise = setup();

        return () => {
            isMounted = false;
            cleanupPromise.then((cleanup) => {
                if (cleanup) cleanup();
            });
        };
    }, [conversationId, user, onMessage, onTyping, onRead]);

    /**
     * Gửi tin nhắn qua WebSocket
     */
    const sendMessage = useCallback(
        (content: string, replyToId: string | null = null) => {
            const client = socketService.getClient();
            if (client?.connected) {
                client.publish({
                    destination: "/app/chat.send",
                    body: JSON.stringify({
                        conversationId,
                        content,
                        type: "TEXT",
                        replyToId,
                    }),
                });
            }
        },
        [conversationId]
    );

    /**
     * Gửi trạng thái đang gõ
     */
    const sendTyping = useCallback(
        (isTyping: boolean) => {
            const client = socketService.getClient();
            if (client?.connected) {
                client.publish({
                    destination: "/app/chat.typing",
                    body: JSON.stringify({
                        conversationId,
                        typing: isTyping,
                    }),
                });
            }
        },
        [conversationId]
    );

    /**
     * Đánh dấu đã xem
     */
    const sendSeen = useCallback((messageId: string) => {
        const client = socketService.getClient();
        if (client?.connected) {
            client.publish({
                destination: "/app/chat.seen",
                body: JSON.stringify({ messageId }),
            });
        }
    }, []);

    return {
        sendMessage,
        sendTyping,
        sendSeen,
        isConnected: socketService.isConnected(),
    };
}
