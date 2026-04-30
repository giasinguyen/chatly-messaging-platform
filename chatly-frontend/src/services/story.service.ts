import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { Story, StoryCreationRequest } from "@/types/story";

export const storyService = {
    create: async (payload: StoryCreationRequest): Promise<ApiResponse<Story>> => {
        const response = await axiosClient.post<ApiResponse<Story>>("/api/stories", payload);
        return response.data;
    },

    getFeed: async (): Promise<ApiResponse<Story[]>> => {
        const response = await axiosClient.get<ApiResponse<Story[]>>("/api/stories/feed");
        return response.data;
    },

    getMyStories: async (): Promise<ApiResponse<Story[]>> => {
        const response = await axiosClient.get<ApiResponse<Story[]>>("/api/stories/me");
        return response.data;
    },

    getUserStories: async (userId: string): Promise<ApiResponse<Story[]>> => {
        const response = await axiosClient.get<ApiResponse<Story[]>>(`/api/stories/users/${userId}`);
        return response.data;
    },
};
