import { useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSocketAuthError, socketService } from '@/services/socket.service';
import { messageService } from '@/services/message.service';
import { useAuthStore } from '@/store/auth.store';
import type { Message, ChatEvent, Attachment, Poll, LocationPayload } from '@/types/message';

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

export function useChatSocket({ conversationId, onEvent, onTyping, onRead }: UseChatSocketProps) {
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

      const unsubscribeEvents = socketService.subscribeOnConnect(
        `/topic/conversation.${conversationId}`,
        (payload) => {
          const event = JSON.parse(payload.body) as ChatEvent;
          onEventRef.current(event);
        }
      );

      const unsubscribeTyping = socketService.subscribeOnConnect(
        `/topic/conversation.${conversationId}.typing`,
        (payload) => {
          const data = JSON.parse(payload.body) as TypingData;
          onTypingRef.current(data);
        }
      );

      const unsubscribeRead = socketService.subscribeOnConnect(
        `/topic/conversation.${conversationId}.read`,
        (payload) => {
          const msg = JSON.parse(payload.body) as Message;
          onReadRef.current(msg);
        }
      );

      cleanupFns = [unsubscribeEvents, unsubscribeTyping, unsubscribeRead];
    };

    setup().catch((error: unknown) => {
      if (!isSocketAuthError(error)) {
        console.error(error);
      }
    });

    return () => {
      isMounted = false;
      cleanupFns.forEach((fn) => fn());
    };
  }, [conversationId, user]);

  // Send a message via WebSocket
  const sendMessage = useCallback(
    (
      content: string,
      replyToId: string | null = null,
      attachments?: Attachment[],
      messageType?: string,
      priority?: 'IMPORTANT' | 'URGENT',
      location?: LocationPayload,
      poll?: Poll
    ): boolean => {
      const hasAttachments = attachments && attachments.length > 0;
      return socketService.publish('/app/chat.send', {
        conversationId,
        content,
        type:
          messageType ??
          (poll ? 'POLL' : hasAttachments ? resolveMessageType(attachments![0].type) : 'TEXT'),
        replyToId,
        attachments: hasAttachments ? attachments : undefined,
        priority: priority ?? undefined,
        location: location ?? undefined,
        poll: poll ?? undefined,
      });
    },
    [conversationId]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean): boolean => {
      return socketService.publish('/app/chat.typing', {
        conversationId,
        typing: isTyping,
      });
    },
    [conversationId]
  );

  // Send seen receipt
  const sendSeen = useCallback((messageId: string): boolean => {
    const isPublished = socketService.publish('/app/chat.seen', { messageId });
    if (!isPublished) {
      void messageService.markAsSeen(messageId).catch(() => {});
    }
    return isPublished;
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
