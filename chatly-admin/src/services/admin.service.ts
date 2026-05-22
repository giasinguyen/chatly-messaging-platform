import { apiClient } from './apiClient';
import { ApiResponse, AdminStatsResponse } from './types';

export const adminService = {
  getStats: async (): Promise<ApiResponse<AdminStatsResponse>> => {
    const response = await apiClient.get<ApiResponse<AdminStatsResponse>>('/api/admin/stats');
    return response.data;
  },

  suspendUser: async (userId: string, suspend: boolean): Promise<ApiResponse<void>> => {
    const response = await apiClient.put<ApiResponse<void>>(
      `/api/admin/users/${userId}/suspend?suspend=${suspend}`
    );
    return response.data;
  }
};
