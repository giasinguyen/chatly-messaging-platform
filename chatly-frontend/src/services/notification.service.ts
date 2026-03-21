import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { Notification } from "@/types/notification";

export const notificationService = {
    getNotifications: async (
        page = 0,
        size = 20,
    ): Promise<ApiResponse<Notification[]>> => {
        const response = await axiosClient.get<ApiResponse<Notification[]>>(
            "/api/notifications",
            { params: { page, size } },
        );
        return response.data;
    },

    getUnreadCount: async (): Promise<ApiResponse<number>> => {
        const response = await axiosClient.get<ApiResponse<number>>(
            "/api/notifications/unread-count",
        );
        return response.data;
    },

    markAsRead: async (notificationId: string): Promise<ApiResponse<Notification>> => {
        const response = await axiosClient.put<ApiResponse<Notification>>(
            `/api/notifications/${notificationId}/read`,
        );
        return response.data;
    },

    markAllAsRead: async (): Promise<ApiResponse<void>> => {
        const response = await axiosClient.put<ApiResponse<void>>(
            "/api/notifications/read-all",
        );
        return response.data;
    },
};
