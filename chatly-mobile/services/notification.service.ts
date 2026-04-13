import axiosClient from '@/lib/axiosClient';
import type { NotificationResponse } from '@/types/notification';
import type { ApiResponse } from '@/types/auth';

export const notificationService = {
  async getNotifications(page = 0, size = 20) {
    const { data } = await axiosClient.get<ApiResponse<NotificationResponse[]>>(
      `/api/notifications?page=${page}&size=${size}`
    );
    return data;
  },

  async getUnreadCount() {
    const { data } = await axiosClient.get<ApiResponse<number>>('/api/notifications/unread-count');
    return data;
  },

  async markAsRead(notificationId: string) {
    const { data } = await axiosClient.put<ApiResponse<NotificationResponse>>(
      `/api/notifications/${notificationId}/read`
    );
    return data;
  },

  async markAllAsRead() {
    await axiosClient.put('/api/notifications/read-all');
  },
};
