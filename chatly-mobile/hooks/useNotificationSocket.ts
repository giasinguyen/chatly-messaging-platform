import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { useConversationStore } from '@/store/conversation.store';
import { useConversationPrefsStore, isConvMuted } from '@/store/conversationPrefs.store';
import type { NotificationEvent } from '@/types/notification';

/**
 * Hook to subscribe to /user/queue/notifications for realtime notifications
 */
export function useNotificationSocket() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const { addNotification, setUnreadCount, showBanner } = useNotificationStore();
  const handleIncomingMessage = useConversationStore((s) => s.handleIncomingMessage);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let cleanupFn: (() => void) | undefined;

    const setup = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token || !isMounted) return;

      await socketService.connect(token);
      if (!isMounted) return;

      const sub = socketService.subscribe('/user/queue/notifications', (payload) => {
        if (__DEV__) console.log('--- NOTIFICATION RECEIVED ---');
        const event = JSON.parse(payload.body) as NotificationEvent;
        if (__DEV__) console.log('Event type:', event.notification?.type);
        if (__DEV__) console.log('Reference ID (Conv ID):', event.notification?.referenceId);
        
        // Update unread count in store
        if (typeof event.unreadCount === 'number') {
          if (__DEV__) console.log('Updating global unread count to:', event.unreadCount);
          setUnreadCount(event.unreadCount);
        }

        if (event.notification) {
          if (__DEV__) console.log('Adding notification to store:', event.notification.id);
          addNotification(event.notification);

          // Logic to show banner only if NOT in the conversation mentioned
          const isChatScene = pathname.startsWith('/chat/');
          const currentChatId = isChatScene ? pathname.split('/').pop() : null;
          
          const isAtThisChat = event.notification.type === 'NEW_MESSAGE' && 
                               event.notification.referenceId === currentChatId;

          // Update conversation list real-time
          if (event.notification.type === 'NEW_MESSAGE') {
            if (__DEV__) console.log('Triggering handleIncomingMessage for conv:', event.notification.referenceId);
            handleIncomingMessage(event.notification);
          }

          if (!isAtThisChat) {
            const convPrefs = useConversationPrefsStore.getState().prefs[event.notification.referenceId ?? ''] ?? {};
            if (!isConvMuted(convPrefs)) {
              if (__DEV__) console.log('Showing in-app banner');
              showBanner(event.notification);
            } else {
              if (__DEV__) console.log('Conversation is muted, skipping banner');
            }
          } else {
            if (__DEV__) console.log('User is in this chat, skipping banner');
          }
        }
      });

      cleanupFn = () => sub?.unsubscribe();
    };

    setup().catch(console.error);

    return () => {
      isMounted = false;
      cleanupFn?.();
    };
  }, [user, pathname, setUnreadCount, addNotification, handleIncomingMessage, showBanner]);
}
