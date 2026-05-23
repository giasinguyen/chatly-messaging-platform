import axiosClient from "@/lib/axiosClient";
import type { ApiResponse, PagedResponse, UserResponse } from "@/types/auth";
import type {
  AdminAuditLogResponse,
  AdminCreateUserRequest,
  AdminSettingsRequest,
  AdminSettingsResponse,
  AdminStatsResponse,
} from "@/types/admin";
import type { ConversationResponse, ConversationType } from "@/types/conversation";
import type { Message } from "@/types/message";
import type { Notification, NotificationType } from "@/types/notification";
import type { Post } from "@/types/post";

interface AdminListParams {
  page?: number;
  size?: number;
}

interface AdminSearchParams extends AdminListParams {
  q?: string;
  status?: string;
}

interface AdminPostParams extends AdminSearchParams {
  hashtag?: string | null;
}

interface AdminConversationParams extends AdminSearchParams {
  type?: ConversationType | null;
}

interface AdminMessageParams extends AdminSearchParams {
  conversationId?: string;
  senderId?: string;
}

interface AdminNotificationParams extends AdminListParams {
  type?: NotificationType | null;
  read?: boolean | null;
}

interface AdminAuditParams extends AdminListParams {
  type?: string | null;
}

export const adminService = {
  getStats: async (): Promise<ApiResponse<AdminStatsResponse>> => {
    const response = await axiosClient.get<ApiResponse<AdminStatsResponse>>("/api/admin/stats");
    return response.data;
  },

  listUsers: async (
    params: AdminSearchParams = {}
  ): Promise<ApiResponse<PagedResponse<UserResponse>>> => {
    const response = await axiosClient.get<ApiResponse<PagedResponse<UserResponse>>>(
      "/api/admin/users",
      { params }
    );
    return response.data;
  },

  getUser: async (userId: string): Promise<ApiResponse<UserResponse>> => {
    const response = await axiosClient.get<ApiResponse<UserResponse>>(
      `/api/admin/users/${userId}`
    );
    return response.data;
  },

  createUser: async (
    payload: AdminCreateUserRequest
  ): Promise<ApiResponse<UserResponse>> => {
    const response = await axiosClient.post<ApiResponse<UserResponse>>(
      "/api/admin/users",
      payload
    );
    return response.data;
  },

  suspendUser: async (userId: string, suspend: boolean): Promise<ApiResponse<void>> => {
    const response = await axiosClient.put<ApiResponse<void>>(
      `/api/admin/users/${userId}/suspend`,
      null,
      { params: { suspend } }
    );
    return response.data;
  },

  listPosts: async (
    params: AdminPostParams = {}
  ): Promise<ApiResponse<PagedResponse<Post>>> => {
    const response = await axiosClient.get<ApiResponse<PagedResponse<Post>>>(
      "/api/admin/posts",
      { params }
    );
    return response.data;
  },

  getPost: async (postId: string): Promise<ApiResponse<Post>> => {
    const response = await axiosClient.get<ApiResponse<Post>>(
      `/api/admin/posts/${postId}`
    );
    return response.data;
  },

  deletePost: async (postId: string): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(
      `/api/admin/posts/${postId}`
    );
    return response.data;
  },

  listConversations: async (
    params: AdminConversationParams = {}
  ): Promise<ApiResponse<PagedResponse<ConversationResponse>>> => {
    const response = await axiosClient.get<ApiResponse<PagedResponse<ConversationResponse>>>(
      "/api/admin/conversations",
      { params }
    );
    return response.data;
  },

  getConversation: async (
    conversationId: string
  ): Promise<ApiResponse<ConversationResponse>> => {
    const response = await axiosClient.get<ApiResponse<ConversationResponse>>(
      `/api/admin/conversations/${conversationId}`
    );
    return response.data;
  },

  deleteConversation: async (conversationId: string): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(
      `/api/admin/conversations/${conversationId}`
    );
    return response.data;
  },

  listMessages: async (
    params: AdminMessageParams = {}
  ): Promise<ApiResponse<PagedResponse<Message>>> => {
    const response = await axiosClient.get<ApiResponse<PagedResponse<Message>>>(
      "/api/admin/messages",
      { params }
    );
    return response.data;
  },

  getMessage: async (messageId: string): Promise<ApiResponse<Message>> => {
    const response = await axiosClient.get<ApiResponse<Message>>(
      `/api/admin/messages/${messageId}`
    );
    return response.data;
  },

  deleteMessage: async (messageId: string): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(
      `/api/admin/messages/${messageId}`
    );
    return response.data;
  },

  listNotifications: async (
    params: AdminNotificationParams = {}
  ): Promise<ApiResponse<PagedResponse<Notification>>> => {
    const response = await axiosClient.get<ApiResponse<PagedResponse<Notification>>>(
      "/api/admin/notifications",
      { params }
    );
    return response.data;
  },

  getNotification: async (
    notificationId: string
  ): Promise<ApiResponse<Notification>> => {
    const response = await axiosClient.get<ApiResponse<Notification>>(
      `/api/admin/notifications/${notificationId}`
    );
    return response.data;
  },

  listAuditLogs: async (
    params: AdminAuditParams = {}
  ): Promise<ApiResponse<PagedResponse<AdminAuditLogResponse>>> => {
    const response = await axiosClient.get<ApiResponse<PagedResponse<AdminAuditLogResponse>>>(
      "/api/admin/audit-logs",
      { params }
    );
    return response.data;
  },

  getSettings: async (): Promise<ApiResponse<AdminSettingsResponse>> => {
    const response = await axiosClient.get<ApiResponse<AdminSettingsResponse>>(
      "/api/admin/settings"
    );
    return response.data;
  },

  updateSettings: async (
    payload: AdminSettingsRequest
  ): Promise<ApiResponse<AdminSettingsResponse>> => {
    const response = await axiosClient.put<ApiResponse<AdminSettingsResponse>>(
      "/api/admin/settings",
      payload
    );
    return response.data;
  },
};
