import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { ReportResponse, ReportStatus, SpringPage } from "@/types/admin";

export const reportService = {
  list: async (status?: ReportStatus, page = 0, size = 20): Promise<ApiResponse<SpringPage<ReportResponse>>> => {
    const statusQuery = status ? `&status=${status}` : "";
    const response = await axiosClient.get<ApiResponse<SpringPage<ReportResponse>>>(
      `/api/reports?page=${page}&size=${size}${statusQuery}`
    );
    return response.data;
  },

  updateStatus: async (reportId: string, status: ReportStatus): Promise<ApiResponse<ReportResponse>> => {
    const response = await axiosClient.put<ApiResponse<ReportResponse>>(
      `/api/reports/${reportId}/status?status=${status}`
    );
    return response.data;
  },

  listUserReports: async (status?: ReportStatus, page = 0, size = 20): Promise<ApiResponse<SpringPage<ReportResponse>>> => {
    const statusQuery = status ? `&status=${status}` : "";
    const response = await axiosClient.get<ApiResponse<SpringPage<ReportResponse>>>(
      `/api/reports/users?page=${page}&size=${size}${statusQuery}`
    );
    return response.data;
  },

  updateUserReportStatus: async (reportId: string, status: ReportStatus): Promise<ApiResponse<ReportResponse>> => {
    const response = await axiosClient.put<ApiResponse<ReportResponse>>(
      `/api/reports/users/${reportId}/status?status=${status}`
    );
    return response.data;
  },
};
