import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type {
    FollowersPage,
    FollowingPage,
    UserSocialStats,
} from "@/types/follow";

export const followService = {
    follow: async (userId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.post<ApiResponse<void>>(
            `/api/follows/${userId}`,
        );
        return response.data;
    },

    unfollow: async (userId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(
            `/api/follows/${userId}`,
        );
        return response.data;
    },

    getFollowers: async (
        userId: string,
        page = 0,
        size = 20,
    ): Promise<ApiResponse<FollowersPage>> => {
        const response = await axiosClient.get<ApiResponse<FollowersPage>>(
            `/api/users/${userId}/followers`,
            { params: { page, size } },
        );
        return response.data;
    },

    getFollowing: async (
        userId: string,
        page = 0,
        size = 20,
    ): Promise<ApiResponse<FollowingPage>> => {
        const response = await axiosClient.get<ApiResponse<FollowingPage>>(
            `/api/users/${userId}/following`,
            { params: { page, size } },
        );
        return response.data;
    },

    getStats: async (userId: string): Promise<ApiResponse<UserSocialStats>> => {
        const response = await axiosClient.get<ApiResponse<UserSocialStats>>(
            `/api/users/${userId}/stats`,
        );
        return response.data;
    },
};
