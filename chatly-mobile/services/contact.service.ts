import axiosClient from '@/lib/axiosClient';
import type { ApiResponse } from '@/types/auth';
import type { ContactResponse, ContactRequestPayload, ContactStatus, BlockStatusResponse } from '@/types/contact';

export const contactService = {
  getAll: async (): Promise<ApiResponse<ContactResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<ContactResponse[]>>('/api/contacts');
    return response.data;
  },

  getByStatus: async (status: ContactStatus): Promise<ApiResponse<ContactResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<ContactResponse[]>>(
      `/api/contacts/status/${status}`,
    );
    return response.data;
  },

  sendRequest: async (payload: ContactRequestPayload): Promise<ApiResponse<ContactResponse>> => {
    const response = await axiosClient.post<ApiResponse<ContactResponse>>(
      '/api/contacts',
      payload,
    );
    return response.data;
  },

  accept: async (id: string): Promise<ApiResponse<ContactResponse>> => {
    const response = await axiosClient.put<ApiResponse<ContactResponse>>(
      `/api/contacts/${id}/accept`,
    );
    return response.data;
  },

  block: async (id: string): Promise<ApiResponse<ContactResponse>> => {
    const response = await axiosClient.put<ApiResponse<ContactResponse>>(
      `/api/contacts/${id}/block`,
    );
    return response.data;
  },

  unblock: async (id: string): Promise<ApiResponse<ContactResponse>> => {
    const response = await axiosClient.put<ApiResponse<ContactResponse>>(
      `/api/contacts/${id}/unblock`,
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(`/api/contacts/${id}`);
    return response.data;
  },

  blockStatus: async (userId: string): Promise<ApiResponse<BlockStatusResponse>> => {
    const response = await axiosClient.get<ApiResponse<BlockStatusResponse>>(
      `/api/contacts/block-status/${userId}`,
    );
    return response.data;
  },

  /** Block a user directly by userId — creates the contact record if needed. */
  blockByUser: async (userId: string): Promise<ApiResponse<ContactResponse>> => {
    const response = await axiosClient.put<ApiResponse<ContactResponse>>(
      `/api/contacts/block-by-user/${userId}`,
    );
    return response.data;
  },

  /** Unblock a user directly by userId. */
  unblockByUser: async (userId: string): Promise<ApiResponse<ContactResponse>> => {
    const response = await axiosClient.put<ApiResponse<ContactResponse>>(
      `/api/contacts/unblock-by-user/${userId}`,
    );
    return response.data;
  },

  /** Get the contact record between current user and another user (null if no relation). */
  getByUser: async (userId: string): Promise<ApiResponse<ContactResponse | null>> => {
    const response = await axiosClient.get<ApiResponse<ContactResponse | null>>(
      `/api/contacts/by-user/${userId}`,
    );
    return response.data;
  },

  getFriendCount: async (userId: string): Promise<ApiResponse<number>> => {
    const response = await axiosClient.get<ApiResponse<number>>(
      `/api/contacts/users/${userId}/friend-count`,
    );
    return response.data;
  },
};
