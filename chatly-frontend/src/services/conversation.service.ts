import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { ConversationResponse } from "@/types/conversation";

/**
 * CONVERSATION SERVICE
 * Contains APIs related to Conversations.
 */
export const conversationService = {
    /**
     * Get the list of all conversations for the current user.
     */
    getMyConversations: async (): Promise<ApiResponse<ConversationResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<ConversationResponse[]>>(
            "/api/conversations",
        );
        return response.data;
    },

    /**
     * Get conversation details by ID.
     */
    getById: async (id: string): Promise<ApiResponse<ConversationResponse>> => {
        const response = await axiosClient.get<ApiResponse<ConversationResponse>>(
            `/api/conversations/${id}`,
        );
        return response.data;
    },

    create: async (payload: { type: string; participantIds: string[]; name?: string }): Promise<ApiResponse<ConversationResponse>> => {
        const response = await axiosClient.post<ApiResponse<ConversationResponse>>(
            "/api/conversations",
            payload
        );
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(`/api/conversations/${id}`);
        return response.data;
    },

    /**
     * Pin a conversation (move to top)
     */
    pin: async (id: string): Promise<ApiResponse<ConversationResponse>> => {
        const response = await axiosClient.put<ApiResponse<ConversationResponse>>(
            `/api/conversations/${id}/pin`,
            {}
        );
        return response.data;
    },

    /**
     * Unpin a conversation
     */
    unpin: async (id: string): Promise<ApiResponse<ConversationResponse>> => {
        const response = await axiosClient.put<ApiResponse<ConversationResponse>>(
            `/api/conversations/${id}/unpin`,
            {}
        );
        return response.data;
    },

    /**
     * Mute a conversation
     * @param id Conversation ID
     * @param duration Duration in milliseconds, null for permanent
     */
    mute: async (id: string, duration?: number | null): Promise<ApiResponse<ConversationResponse>> => {
        const response = await axiosClient.put<ApiResponse<ConversationResponse>>(
            `/api/conversations/${id}/mute`,
            { duration }
        );
        return response.data;
    },

    /**
     * Unmute a conversation
     */
    unmute: async (id: string): Promise<ApiResponse<ConversationResponse>> => {
        const response = await axiosClient.put<ApiResponse<ConversationResponse>>(
            `/api/conversations/${id}/unmute`,
            {}
        );
        return response.data;
    },

    /**
     * Set a custom nickname/alias for a contact (PRIVATE conversations only)
     */
    setNickname: async (id: string, nickname: string): Promise<ApiResponse<ConversationResponse>> => {
        const response = await axiosClient.put<ApiResponse<ConversationResponse>>(
            `/api/conversations/${id}/nickname`,
            { nickname }
        );
        return response.data;
    },
};
