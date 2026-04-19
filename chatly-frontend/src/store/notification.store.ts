import { create } from "zustand";
import type { Notification } from "@/types/notification";

interface NotificationStore {
    notifications: Notification[];
    loading: boolean;
    setNotifications: (ns: Notification[]) => void;
    setLoading: (loading: boolean) => void;
    addNotification: (n: Notification) => void;
    markOneRead: (id: string) => void;
    markAllRead: () => void;
    markMsgNotificationsRead: () => void;
    markConvMessagesRead: (conversationId: string) => void;
    removeByTypeAndReference: (type: string, referenceId: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
    notifications: [],
    loading: false,

    setNotifications: (notifications) => set({ notifications }),

    setLoading: (loading) => set({ loading }),

    addNotification: (notification) =>
        set((state) => {
            if (state.notifications.some((n) => n.id === notification.id))
                return state;
            return { notifications: [notification, ...state.notifications] };
        }),

    markOneRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n,
            ),
        })),

    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({
                ...n,
                read: true,
            })),
        })),

    markMsgNotificationsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.type === "NEW_MESSAGE" ? { ...n, read: true } : n,
            ),
        })),

    markConvMessagesRead: (conversationId) =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.type === "NEW_MESSAGE" && n.referenceId === conversationId
                    ? { ...n, read: true } : n,
            ),
        })),

    removeByTypeAndReference: (type, referenceId) =>
        set((state) => ({
            notifications: state.notifications.filter(
                (n) => !(n.type === type && n.referenceId === referenceId),
            ),
        })),
}));
