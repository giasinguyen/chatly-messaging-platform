import { create } from 'zustand';
import type { NotificationResponse } from '@/types/notification';

interface NotificationState {
  notifications: NotificationResponse[];
  unreadCount: number;
  bannerNotification: NotificationResponse | null;
  
  setNotifications: (notifications: NotificationResponse[]) => void;
  addNotification: (notification: NotificationResponse) => void;
  setUnreadCount: (count: number) => void;
  showBanner: (notification: NotificationResponse) => void;
  hideBanner: () => void;
  markAsRead: (notificationId: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  bannerNotification: null,

  setNotifications: (notifications) => set({ notifications }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  showBanner: (bannerNotification) => set({ bannerNotification }),
  
  hideBanner: () => set({ bannerNotification: null }),

  markAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map((n) => 
      n.id === notificationId ? { ...n, read: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
}));
