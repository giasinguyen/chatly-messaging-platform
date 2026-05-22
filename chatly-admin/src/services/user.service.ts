import { apiClient } from './apiClient';
import { ApiResponse, UserResponse, PagedResponse } from './types';

export const userService = {
  getAll: async (): Promise<ApiResponse<UserResponse[]>> => {
    const response = await apiClient.get<ApiResponse<UserResponse[]>>('/api/users');
    return response.data;
  },

  search: async (query: string, page = 0, size = 20): Promise<ApiResponse<PagedResponse<UserResponse>>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<UserResponse>>>(
      `/api/users/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`
    );
    return response.data;
  },

  delete: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/users/${userId}`);
    return response.data;
  }
};
