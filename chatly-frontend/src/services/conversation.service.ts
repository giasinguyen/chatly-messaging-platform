import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { ConversationResponse } from "@/types/conversation";

/**
 * CONVERSATION SERVICE
 * Chứa các API liên quan đến Conversation.
 */
export const conversationService = {
    /**
     * Lấy danh sách tất cả conversations của user hiện tại.
     */
    getMyConversations: async (): Promise<ApiResponse<ConversationResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<ConversationResponse[]>>(
            "/api/conversations",
        );
        return response.data;
    },

    /**
     * Lấy chi tiết một conversation theo id.
     */
    getById: async (id: string): Promise<ApiResponse<ConversationResponse>> => {
        const response = await axiosClient.get<ApiResponse<ConversationResponse>>(
            `/api/conversations/${id}`,
        );
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(`/api/conversations/${id}`);
        return response.data;
    },
};
