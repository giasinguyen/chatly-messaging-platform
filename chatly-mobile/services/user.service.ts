import axiosClient from '@/lib/axiosClient';
import type { ApiResponse, PagedResponse, UserResponse } from '@/types/auth';

export const userService = {
  getMe: async (): Promise<ApiResponse<UserResponse>> => {
    const response = await axiosClient.get<ApiResponse<UserResponse>>('/api/users/me');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<UserResponse>> => {
    const response = await axiosClient.get<ApiResponse<UserResponse>>(`/api/users/${id}`);
    return response.data;
  },

  getAll: async (): Promise<ApiResponse<UserResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<UserResponse[]>>('/api/users');
    return response.data;
  },

  search: async (
    q: string,
    page = 0,
    size = 20,
  ): Promise<ApiResponse<PagedResponse<UserResponse>>> => {
    const response = await axiosClient.get<ApiResponse<PagedResponse<UserResponse>>>(
      '/api/users/search',
      { params: { q, page, size } },
    );
    return response.data;
  },

  update: async (
    id: string,
    payload: Partial<UserResponse>,
  ): Promise<ApiResponse<UserResponse>> => {
    const response = await axiosClient.put<ApiResponse<UserResponse>>(
      `/api/users/${id}`,
      payload,
    );
    return response.data;
  },
};
