import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { StoryResponse } from "@/types/story";

export const storyService = {
    getFeed: async (): Promise<ApiResponse<StoryResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<StoryResponse[]>>("/api/stories/feed");
        return response.data;
    },

    getByUser: async (userId: string): Promise<ApiResponse<StoryResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<StoryResponse[]>>(
            `/api/stories/user/${userId}`,
        );
        return response.data;
    },

    recordView: async (storyId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.post<ApiResponse<void>>(
            `/api/stories/${storyId}/view`,
        );
        return response.data;
    },

    deleteStory: async (storyId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(`/api/stories/${storyId}`);
        return response.data;
    },
};
