import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { UserResponse } from "@/types/auth";
import type { Story, StoryCreationRequest, StoryReactionResponse, StoryReplyResponse } from "@/types/story";

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

    recordView: async (storyId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.post<ApiResponse<void>>(`/api/stories/${storyId}/view`);
        return response.data;
    },

    getViewers: async (storyId: string): Promise<ApiResponse<UserResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<UserResponse[]>>(`/api/stories/${storyId}/viewers`);
        return response.data;
    },

    deleteStory: async (storyId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(`/api/stories/${storyId}`);
        return response.data;
    },

    reactToStory: async (storyId: string, emoji: string): Promise<ApiResponse<StoryReactionResponse>> => {
        const response = await axiosClient.post<ApiResponse<StoryReactionResponse>>(
            `/api/stories/${storyId}/react`,
            { emoji },
        );
        return response.data;
    },

    removeReaction: async (storyId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(`/api/stories/${storyId}/react`);
        return response.data;
    },

    getReactions: async (storyId: string): Promise<ApiResponse<StoryReactionResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<StoryReactionResponse[]>>(
            `/api/stories/${storyId}/reactions`,
        );
        return response.data;
    },

    replyToStory: async (storyId: string, content: string): Promise<ApiResponse<StoryReplyResponse>> => {
        const response = await axiosClient.post<ApiResponse<StoryReplyResponse>>(
            `/api/stories/${storyId}/reply`,
            { content },
        );
        return response.data;
    },

    getReplies: async (storyId: string): Promise<ApiResponse<StoryReplyResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<StoryReplyResponse[]>>(
            `/api/stories/${storyId}/replies`,
        );
        return response.data;
    },
};
