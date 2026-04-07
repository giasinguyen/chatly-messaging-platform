import { useEffect, useCallback } from "react";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import type { Message, ChatEvent, Attachment } from "@/types/message";

interface TypingData {
    userId: string;
    typing: boolean;
}

interface UseChatSocketProps {
    conversationId: string;
    onEvent: (event: ChatEvent) => void;
    onTyping: (data: TypingData) => void;
    onRead: (message: Message) => void;
}

export function useChatSocket({
    conversationId,
    onEvent,
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

            // 1. Subscribe to chat events (SEND, EDIT, RECALL, DELETE)
            const eventSub = client.subscribe(
                `/topic/conversation.${conversationId}`,
                (payload) => {
                    const event = JSON.parse(payload.body) as ChatEvent;
                    onEvent(event);
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
                eventSub.unsubscribe();
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
    }, [conversationId, user, onEvent, onTyping, onRead]);

    const sendMessage = useCallback(
        (content: string, replyToId: string | null = null, attachments?: Attachment[]): boolean => {
            const client = socketService.getClient();
            if (client?.connected) {
                const hasAttachments = attachments && attachments.length > 0;
                client.publish({
                    destination: "/app/chat.send",
                    body: JSON.stringify({
                        conversationId,
                        content,
                        type: hasAttachments ? resolveMessageType(attachments![0].type) : "TEXT",
                        replyToId,
                        attachments: hasAttachments ? attachments : undefined,
                    }),
                });
                return true;
            }
            return false;
        },
        [conversationId]
    );

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

function resolveMessageType(mimeType?: string): string {
    if (!mimeType) return "FILE";
    if (mimeType.startsWith("image/")) return "IMAGE";
    if (mimeType.startsWith("video/")) return "VIDEO";
    if (mimeType.startsWith("audio/")) return "AUDIO";
    return "FILE";
}
