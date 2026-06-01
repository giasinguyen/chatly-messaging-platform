import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, router } from 'expo-router';
import { Alert } from 'react-native';
import i18n from '@/lib/i18n';
import { isSocketAuthError, socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { useConversationStore } from '@/store/conversation.store';
import { useContactStore } from '@/store/contact.store';
import { isConvMuted, useConversationPrefsStore } from '@/store/conversationPrefs.store';
import type { NotificationEvent, NotificationResponse } from '@/types/notification';

interface UseNotificationSocketOptions {
  onForegroundMessage?: (notification: NotificationResponse) => void;
}

const CONVERSATION_REFRESH_NOTIFICATION_TYPES = new Set<NotificationResponse['type']>([
  'GROUP_INVITE',
  'GROUP_LEAVE',
  'GROUP_UPDATED',
  'MEMBER_JOINED',
]);

const FOREGROUND_NOTIFICATION_TYPES = new Set<NotificationResponse['type']>([
  'NEW_MESSAGE',
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'POST_LIKED',
  'POST_COMMENTED',
  'POST_SHARED',
  'POST_MENTION',
  'COMMENT_REPLIED',
  'GROUP_INVITE',
  'GROUP_UPDATED',
  'MEMBER_JOINED',
]);

/**
 * Hook to subscribe to /user/queue/notifications for realtime notifications
 */
export function useNotificationSocket(options: UseNotificationSocketOptions = {}) {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const optionsRef = useRef(options);
  const { addNotification, setUnreadCount } = useNotificationStore();
  const handleIncomingMessage = useConversationStore((s) => s.handleIncomingMessage);

  pathnameRef.current = pathname;
  optionsRef.current = options;

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
          const isSelfMessage =
            event.notification.type === 'NEW_MESSAGE' && event.notification.senderId === user.id;

          if (!isSelfMessage) {
            addNotification(event.notification);
          }

          const currentPathname = pathnameRef.current;
          const isChatScene = currentPathname.startsWith('/chat/');
          const currentChatId = isChatScene ? currentPathname.split('/').pop() : null;

          // Update conversation list real-time
          if (
            event.notification.type === 'NEW_MESSAGE' ||
            CONVERSATION_REFRESH_NOTIFICATION_TYPES.has(event.notification.type)
          ) {
            if (event.notification.type === 'NEW_MESSAGE') {
              handleIncomingMessage(event.notification, user.id);
              const conversationId = event.notification.referenceId;
              const prefs = useConversationPrefsStore.getState().prefs[conversationId] ?? {};
              const shouldShowForegroundMessage =
                conversationId &&
                conversationId !== currentChatId &&
                !isConvMuted(prefs) &&
                !isSelfMessage;

              if (shouldShowForegroundMessage) {
                optionsRef.current.onForegroundMessage?.(event.notification);
              }
            } else {
              useConversationStore.getState().fetchConversations();
              if (FOREGROUND_NOTIFICATION_TYPES.has(event.notification.type)) {
                optionsRef.current.onForegroundMessage?.(event.notification);
              }
              if (
                event.notification.type === 'GROUP_LEAVE' &&
                event.notification.referenceId === currentChatId
              ) {
                Alert.alert(
                  i18n.t('mobile.chat.removed_from_group_title'),
                  i18n.t('mobile.chat.removed_from_group_body')
                );
                router.replace('/(tabs)/chats');
              }
            }
          }

          // Trigger pending contacts refresh on friend request
          if (event.notification.type === 'FRIEND_REQUEST') {
            useContactStore.getState().triggerPendingRefresh();
          }

          if (
            event.notification.type !== 'NEW_MESSAGE' &&
            !CONVERSATION_REFRESH_NOTIFICATION_TYPES.has(event.notification.type) &&
            FOREGROUND_NOTIFICATION_TYPES.has(event.notification.type)
          ) {
            optionsRef.current.onForegroundMessage?.(event.notification);
          }
        }

        if (typeof event.unreadCount === 'number') {
          setUnreadCount(event.unreadCount);
        }
      });
    };

    setup().catch((error: unknown) => {
      if (!isSocketAuthError(error)) {
        console.error(error);
      }
    });

    return () => {
      isMounted = false;
      cleanupFn?.();
    };
  }, [user, setUnreadCount, addNotification, handleIncomingMessage]);
}
