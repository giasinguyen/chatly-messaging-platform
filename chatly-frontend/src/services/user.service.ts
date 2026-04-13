import axiosClient from "@/lib/axiosClient";
import type {
    ApiResponse,
    UserResponse,
    UserUpdateRequest,
    PagedResponse,
} from "@/types/auth";

/**
 * USER SERVICE
 * Contains APIs related to user information: profile, update...
 */
export const userService = {
    /**
     * Get current user information from session/token
     */
    getMe: async (): Promise<ApiResponse<UserResponse>> => {
        const response =
            await axiosClient.get<ApiResponse<UserResponse>>("/api/users/me");
        return response.data;
    },

    /**
     * List of all users
     */
    getAll: async (): Promise<ApiResponse<UserResponse[]>> => {
        const response =
            await axiosClient.get<ApiResponse<UserResponse[]>>("/api/users");
        return response.data;
    },

    /**
     * Search for users by keyword (displayName, username, email, phone)
     */
    search: async (
        q: string,
        page = 0,
        size = 20,
    ): Promise<ApiResponse<PagedResponse<UserResponse>>> => {
        const response = await axiosClient.get<
            ApiResponse<PagedResponse<UserResponse>>
        >(
            `/api/users/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`,
        );
        return response.data;
    },

    /**
     * Get a user by ID. Returns a limited profile if the user has blocked the requester.
     */
    getUserById: async (id: string): Promise<ApiResponse<UserResponse>> => {
        const response = await axiosClient.get<ApiResponse<UserResponse>>(
            `/api/users/${id}`,
        );
        return response.data;
    },

    /**
     * Update user information
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

    getById: async (id: string): Promise<ApiResponse<UserResponse>> => {
        const response = await axiosClient.get<ApiResponse<UserResponse>>(
            `/api/users/${id}`,
        );
        return response.data;
    },
};

