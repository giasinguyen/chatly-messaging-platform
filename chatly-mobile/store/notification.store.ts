import { create } from 'zustand';
import { getNotificationScope } from '@/constants/notification';
import type { NotificationResponse, NotificationScope } from '@/types/notification';

interface NotificationState {
  notifications: NotificationResponse[];
  unreadCount: number;
  chatUnreadCount: number;
  socialUnreadCount: number;

  setNotifications: (notifications: NotificationResponse[]) => void;
  addNotification: (notification: NotificationResponse) => void;
  setUnreadCount: (count: number) => void;
  setScopedUnreadCount: (scope: NotificationScope, count: number) => void;
  markAsRead: (notificationId: string) => void;
  markScopeAsRead: (scope: NotificationScope) => void;
  removeByTypeAndReference: (type: string, referenceId: string) => void;
}

function decrementScopedCount(
  state: NotificationState,
  notification: NotificationResponse
): Pick<NotificationState, 'chatUnreadCount' | 'socialUnreadCount'> {
  const scope = getNotificationScope(notification.type);

  return {
    chatUnreadCount:
      scope === 'chat' ? Math.max(0, state.chatUnreadCount - 1) : state.chatUnreadCount,
    socialUnreadCount:
      scope === 'social' ? Math.max(0, state.socialUnreadCount - 1) : state.socialUnreadCount,
  };
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  chatUnreadCount: 0,
  socialUnreadCount: 0,

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => {
      const existingNotification = state.notifications.find((item) => item.id === notification.id);
      if (existingNotification) {
        return {
          notifications: state.notifications.map((item) =>
            item.id === notification.id ? notification : item
          ),
        };
      }

      const scope = getNotificationScope(notification.type);
      const shouldIncrementUnread = !notification.read;

      return {
        notifications: [notification, ...state.notifications],
        unreadCount: shouldIncrementUnread ? state.unreadCount + 1 : state.unreadCount,
        chatUnreadCount:
          shouldIncrementUnread && scope === 'chat'
            ? state.chatUnreadCount + 1
            : state.chatUnreadCount,
        socialUnreadCount:
          shouldIncrementUnread && scope === 'social'
            ? state.socialUnreadCount + 1
            : state.socialUnreadCount,
      };
    }),

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  setScopedUnreadCount: (scope, count) =>
    set((state) => ({
      chatUnreadCount: scope === 'chat' ? count : state.chatUnreadCount,
      socialUnreadCount: scope === 'social' ? count : state.socialUnreadCount,
      unreadCount: scope === 'all' ? count : state.unreadCount,
    })),

  markAsRead: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find((item) => item.id === notificationId);
      if (!notification || notification.read) {
        return state;
      }

      return {
        notifications: state.notifications.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        ...decrementScopedCount(state, notification),
      };
    }),

  markScopeAsRead: (scope) =>
    set((state) => {
      const scopedUnreadCount =
        scope === 'chat'
          ? state.chatUnreadCount
          : scope === 'social'
            ? state.socialUnreadCount
            : state.unreadCount;

      return {
        notifications: state.notifications.map((notification) => {
          const notificationScope = getNotificationScope(notification.type);
          const isInScope = scope === 'all' || notificationScope === scope;
          return isInScope ? { ...notification, read: true } : notification;
        }),
        unreadCount: scope === 'all' ? 0 : Math.max(0, state.unreadCount - scopedUnreadCount),
        chatUnreadCount: scope === 'all' || scope === 'chat' ? 0 : state.chatUnreadCount,
        socialUnreadCount: scope === 'all' || scope === 'social' ? 0 : state.socialUnreadCount,
      };
    }),

  removeByTypeAndReference: (type, referenceId) =>
    set((state) => {
      const removedNotifications = state.notifications.filter(
        (n) => n.type === type && n.referenceId === referenceId && !n.read
      );
      const removedChatCount = removedNotifications.filter(
        (notification) => getNotificationScope(notification.type) === 'chat'
      ).length;
      const removedSocialCount = removedNotifications.filter(
        (notification) => getNotificationScope(notification.type) === 'social'
      ).length;

      return {
        notifications: state.notifications.filter(
          (n) => !(n.type === type && n.referenceId === referenceId)
        ),
        unreadCount: Math.max(0, state.unreadCount - removedNotifications.length),
        chatUnreadCount: Math.max(0, state.chatUnreadCount - removedChatCount),
        socialUnreadCount: Math.max(0, state.socialUnreadCount - removedSocialCount),
      };
    }),
}));
