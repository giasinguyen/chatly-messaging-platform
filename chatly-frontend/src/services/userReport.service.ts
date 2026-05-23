import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type {
    CreateUserReportRequest,
    UserReportResponse,
} from "@/types/userReport";

export const userReportService = {
    create: async (
        reportedUserId: string,
        payload: CreateUserReportRequest,
    ): Promise<ApiResponse<UserReportResponse>> => {
        const response = await axiosClient.post<ApiResponse<UserReportResponse>>(
            "/api/reports/users",
            { reportedUserId, ...payload },
        );
        return response.data;
    },
};
