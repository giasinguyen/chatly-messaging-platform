import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { AdminStatsResponse } from "@/types/admin";

export const adminService = {
  getStats: async (): Promise<ApiResponse<AdminStatsResponse>> => {
    const response = await axiosClient.get<ApiResponse<AdminStatsResponse>>("/api/admin/stats");
    return response.data;
  },

  suspendUser: async (userId: string, suspend: boolean): Promise<ApiResponse<void>> => {
    const response = await axiosClient.put<ApiResponse<void>>(
      `/api/admin/users/${userId}/suspend?suspend=${suspend}`
    );
    return response.data;
  }
};
