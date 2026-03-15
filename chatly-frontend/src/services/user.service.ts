import axiosClient from "@/lib/axiosClient";
import type {
    ApiResponse,
    UserResponse,
    UserUpdateRequest,
} from "@/types/auth";

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

    /**
     * Cập nhật thông tin người dùng
     */
    update: async (
        id: string,
        payload: UserUpdateRequest,
    ): Promise<ApiResponse<UserResponse>> => {
        const response = await axiosClient.put<ApiResponse<UserResponse>>(
            `/api/users/${id}`,
            payload,
        );
        return response.data;
    },
};

