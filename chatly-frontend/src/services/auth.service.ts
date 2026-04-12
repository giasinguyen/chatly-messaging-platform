import axiosClient from "@/lib/axiosClient";
import type { ApiResponse, AuthResponse } from "@/types/auth";

/**
 * AUTH SERVICE
 * Contains APIs related to Authentication: Login, Register, Refresh Token
 */
export const authService = {
    /**
     * Register a new account
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
     * Login (Password or OTP)
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

    forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
        const response = await axiosClient.post<ApiResponse<null>>(
            "/api/auth/forgot-password",
            { email },
        );
        return response.data;
    },

    changePassword: async (payload: {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }): Promise<ApiResponse<null>> => {
        const response = await axiosClient.post<ApiResponse<null>>(
            "/api/auth/change-password",
            payload,
        );
        return response.data;
    },

    /**
     * Logout
     * Call backend API to remove session/token on the server
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

