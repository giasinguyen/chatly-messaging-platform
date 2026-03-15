import axiosClient from "@/lib/axiosClient";
import type { ApiResponse, AuthResponse } from "@/types/auth";

/**
 * AUTH SERVICE
 * Chứa các API liên quan đến Authentication: Login, Register, Refresh Token
 */
export const authService = {
    /**
     * Đăng ký tài khoản mới
     * @param payload
     * @returns
     */
    register: async (payload: any): Promise<ApiResponse<AuthResponse>> => {
        const response = await axiosClient.post<ApiResponse<AuthResponse>>(
            "/api/auth/register",
            payload,
        );
        return response.data;
    },

    /**
     * Đăng nhập (Mật khẩu hoặc OTP)
     * @param payload
     * @returns
     */
    login: async (payload: any): Promise<ApiResponse<AuthResponse>> => {
        const response = await axiosClient.post<ApiResponse<AuthResponse>>(
            "/api/auth/login",
            payload,
        );
        return response.data;
    },

    /**
     * Đăng xuất
     * Gọi backend API để xóa session/token ở server
     */
    logout: async () => {
        const token = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");

        if (token) {
            try {
                await axiosClient.post("/api/auth/logout", {
                    token,
                    refreshToken,
                });
            } catch (error) {
                console.error("Failed to call logout API", error);
            }
        }

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
    },
};

