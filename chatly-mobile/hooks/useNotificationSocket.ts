import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, router } from 'expo-router';
import { Alert } from 'react-native';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { useConversationStore } from '@/store/conversation.store';
import { useContactStore } from '@/store/contact.store';
import type { NotificationEvent } from '@/types/notification';

/**
 * Hook to subscribe to /user/queue/notifications for realtime notifications
 */
export function useNotificationSocket() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const { addNotification, setUnreadCount } = useNotificationStore();
  const handleIncomingMessage = useConversationStore((s) => s.handleIncomingMessage);

  pathnameRef.current = pathname;

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let cleanupFn: (() => void) | undefined;

    const setup = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token || !isMounted) return;

      await socketService.connect(token);
      if (!isMounted) return;

      cleanupFn = socketService.subscribeOnConnect('/user/queue/notifications', (payload) => {
        const event = JSON.parse(payload.body) as NotificationEvent;

        if (event.notification) {
          addNotification(event.notification);

          const currentPathname = pathnameRef.current;
          const isChatScene = currentPathname.startsWith('/chat/');
          const currentChatId = isChatScene ? currentPathname.split('/').pop() : null;

          // Update conversation list real-time
          if (
            event.notification.type === 'NEW_MESSAGE' ||
            event.notification.type === 'GROUP_INVITE' ||
            event.notification.type === 'GROUP_LEAVE'
          ) {
            if (event.notification.type === 'NEW_MESSAGE') {
              handleIncomingMessage(event.notification);
            } else {
              useConversationStore.getState().fetchConversations();
              if (
                event.notification.type === 'GROUP_LEAVE' &&
                event.notification.referenceId === currentChatId
              ) {
                Alert.alert('Group Update', 'You have been removed from this group.');
                router.replace('/(tabs)/chats');
              }
            }
          }

          // Trigger pending contacts refresh on friend request
          if (event.notification.type === 'FRIEND_REQUEST') {
            useContactStore.getState().triggerPendingRefresh();
          }
        }

        if (typeof event.unreadCount === 'number') {
          setUnreadCount(event.unreadCount);
        }
      });
    };

    setup().catch(console.error);

    return () => {
      isMounted = false;
      cleanupFn?.();
    };
  }, [user, setUnreadCount, addNotification, handleIncomingMessage]);
}
