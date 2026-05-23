import axiosClient from '@/lib/axiosClient';
import type { NotificationResponse, NotificationScope } from '@/types/notification';
import type { ApiResponse } from '@/types/auth';

export const notificationService = {
  async getNotifications(page = 0, size = 20, scope: NotificationScope = 'all') {
    const { data } = await axiosClient.get<ApiResponse<NotificationResponse[]>>(
      '/api/notifications',
      { params: { page, size, scope: scope.toUpperCase() } }
    );
    return data;
  },

  async getUnreadCount(scope: NotificationScope = 'all') {
    const { data } = await axiosClient.get<ApiResponse<number>>('/api/notifications/unread-count', {
      params: { scope: scope.toUpperCase() },
    });
    return data;
  },

  async markAsRead(notificationId: string) {
    const { data } = await axiosClient.put<ApiResponse<NotificationResponse>>(
      `/api/notifications/${notificationId}/read`
    );
    return data;
  },

  async markAllAsRead(scope: NotificationScope = 'all') {
    await axiosClient.put('/api/notifications/read-all', undefined, {
      params: { scope: scope.toUpperCase() },
    });
  },
};
