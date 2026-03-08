import axiosClient from "@/lib/axiosClient";
import type { ApiResponse, UserResponse } from "@/types/auth";

/**
 * USER SERVICE
 * Chứa các API liên quan đến thông tin người dùng: profile, update...
 */
export const userService = {
    /**
     * Lấy thông tin người dùng hiện tại từ session/token
     */
    getMe: async (): Promise<ApiResponse<UserResponse>> => {
        const response =
            await axiosClient.get<ApiResponse<UserResponse>>("/api/users/me");
        return response.data;
    },

    /**
     * Danh sách tất cả người dùng
     */
    getAll: async (): Promise<ApiResponse<UserResponse[]>> => {
        const response =
            await axiosClient.get<ApiResponse<UserResponse[]>>("/api/users");
        return response.data;
    },
};

