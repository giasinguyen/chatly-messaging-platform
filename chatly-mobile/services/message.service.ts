import axiosClient from '@/lib/axiosClient';
import type { ApiResponse } from '@/types/auth';
import type { Message } from '@/types/message';

export const messageService = {
  getByConversation: async (
    conversationId: string,
    page = 0,
    size = 20,
  ): Promise<ApiResponse<Message[]>> => {
    const response = await axiosClient.get<ApiResponse<Message[]>>(
      `/api/messages/conversation/${conversationId}`,
      { params: { page, size } },
    );
    return response.data;
  },

  send: async (payload: {
    conversationId: string;
    content: string;
    type?: string;
    replyToId?: string | null;
    attachments?: import('@/types/message').Attachment[];
  }): Promise<ApiResponse<Message>> => {
    const response = await axiosClient.post<ApiResponse<Message>>('/api/messages', payload);
    return response.data;
  },

  markAsSeen: async (messageId: string): Promise<ApiResponse<Message>> => {
    const response = await axiosClient.put<ApiResponse<Message>>(
      `/api/messages/${messageId}/seen`,
    );
    return response.data;
  },

  recall: async (messageId: string): Promise<ApiResponse<Message>> => {
    const response = await axiosClient.put<ApiResponse<Message>>(
      `/api/messages/${messageId}/recall`,
    );
    return response.data;
  },

  edit: async (messageId: string, content: string): Promise<ApiResponse<Message>> => {
    const response = await axiosClient.put<ApiResponse<Message>>(
      `/api/messages/${messageId}/edit`,
      { content },
    );
    return response.data;
  },

  delete: async (messageId: string): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(`/api/messages/${messageId}`);
    return response.data;
  },

  react: async (messageId: string, emoji: string): Promise<ApiResponse<Message>> => {
    const response = await axiosClient.put<ApiResponse<Message>>(
      `/api/messages/${messageId}/react`,
      { emoji },
    );
    return response.data;
  },

  search: async (
    conversationId: string,
    keyword: string,
    page = 0,
    size = 20,
  ): Promise<ApiResponse<Message[]>> => {
    const response = await axiosClient.get<ApiResponse<Message[]>>(
      `/api/messages/conversation/${conversationId}/search`,
      { params: { keyword, page, size } },
    );
    return response.data;
  },
};
