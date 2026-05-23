import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { Notification, NotificationScope } from "@/types/notification";

export const notificationService = {
    getNotifications: async (
        page = 0,
        size = 20,
        scope: NotificationScope = "ALL",
    ): Promise<ApiResponse<Notification[]>> => {
        const response = await axiosClient.get<ApiResponse<Notification[]>>(
            "/api/notifications",
            { params: { page, size, scope } },
        );
        return response.data;
    },

    getUnreadCount: async (scope: NotificationScope = "ALL"): Promise<ApiResponse<number>> => {
        const response = await axiosClient.get<ApiResponse<number>>(
            "/api/notifications/unread-count",
            { params: { scope } },
        );
        return response.data;
    },

    markAsRead: async (notificationId: string): Promise<ApiResponse<Notification>> => {
        const response = await axiosClient.put<ApiResponse<Notification>>(
            `/api/notifications/${notificationId}/read`,
        );
        return response.data;
    },

    markAllAsRead: async (scope: NotificationScope = "ALL"): Promise<ApiResponse<void>> => {
        const response = await axiosClient.put<ApiResponse<void>>(
            "/api/notifications/read-all",
            null,
            { params: { scope } },
        );
        return response.data;
    },
};
