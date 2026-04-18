import { useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import type { Message, ChatEvent, Attachment } from '@/types/message';

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
  const user = useAuthStore((s) => s.user);

  // Use refs to avoid re-subscribing on callback changes
  const onEventRef = useRef(onEvent);
  const onTypingRef = useRef(onTyping);
  const onReadRef = useRef(onRead);
  onEventRef.current = onEvent;
  onTypingRef.current = onTyping;
  onReadRef.current = onRead;

  useEffect(() => {
    if (!conversationId || !user) return;

    let isMounted = true;
    let cleanupFns: (() => void)[] = [];

    const setup = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token || !isMounted) return;

      await socketService.connect(token);

      if (!isMounted) return;

      // 1. Subscribe to chat events (SEND, EDIT, RECALL, DELETE)
      const eventSub = socketService.subscribe(
        `/topic/conversation.${conversationId}`,
        (payload) => {
          const event = JSON.parse(payload.body) as ChatEvent;
          onEventRef.current(event);
        },
      );

      // 2. Subscribe to typing indicators
      const typingSub = socketService.subscribe(
        `/topic/conversation.${conversationId}.typing`,
        (payload) => {
          const data = JSON.parse(payload.body) as TypingData;
          onTypingRef.current(data);
        },
      );

      // 3. Subscribe to read receipts
      const readSub = socketService.subscribe(
        `/topic/conversation.${conversationId}.read`,
        (payload) => {
          const msg = JSON.parse(payload.body) as Message;
          onReadRef.current(msg);
        },
      );

      cleanupFns = [
        () => eventSub?.unsubscribe(),
        () => typingSub?.unsubscribe(),
        () => readSub?.unsubscribe(),
      ];
    };

    setup().catch(console.error);

    return () => {
      isMounted = false;
      cleanupFns.forEach((fn) => fn());
    };
  }, [conversationId, user]);

  // Send a message via WebSocket
  const sendMessage = useCallback(
    (content: string, replyToId: string | null = null, attachments?: Attachment[], messageType?: string, priority?: 'IMPORTANT' | 'URGENT', location?: any): boolean => {
      const hasAttachments = attachments && attachments.length > 0;
      return socketService.publish('/app/chat.send', {
        conversationId,
        content,
        type: messageType ?? (hasAttachments ? resolveMessageType(attachments![0].type) : 'TEXT'),
        replyToId,
        attachments: hasAttachments ? attachments : undefined,
        priority: priority ?? undefined,
        location: location ?? undefined,
      });
    },
    [conversationId],
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean): boolean => {
      return socketService.publish('/app/chat.typing', {
        conversationId,
        typing: isTyping,
      });
    },
    [conversationId],
  );

  // Send seen receipt
  const sendSeen = useCallback((messageId: string): boolean => {
    return socketService.publish('/app/chat.seen', { messageId });
  }, []);

  return {
    sendMessage,
    sendTyping,
    sendSeen,
    isConnected: socketService.isConnected(),
  };
}

function resolveMessageType(mimeType?: string): string {
  if (!mimeType) return 'FILE';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}
