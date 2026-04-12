import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { Message } from "@/types/message";

/**
 * MESSAGE SERVICE
 * Contains APIs related to Messages.
 */
export const messageService = {
    /**
     * Get the list of messages in a conversation, with pagination.
     * API returns in latest first order (descending).
     * Needs reverse() before rendering to display old → new.
     */
    getByConversation: async (
        conversationId: string,
        page = 0,
        size = 20,
    ): Promise<ApiResponse<Message[]>> => {
        const response = await axiosClient.get<ApiResponse<Message[]>>(
            `/api/messages/conversation/${conversationId}`,
            { params: { page, size } },
        );
        return response.data;
    },

    /**
     * Send a new message.
     */
    send: async (payload: {
        conversationId: string;
        content: string;
        type?: string;
        replyToId?: string | null;
        attachments?: import("@/types/message").Attachment[];
    }): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.post<ApiResponse<Message>>(
            "/api/messages",
            payload,
        );
        return response.data;
    },

    forward: async (
        messageId: string,
        targetConversationIds: string[],
    ): Promise<ApiResponse<Message[]>> => {
        const response = await axiosClient.post<ApiResponse<Message[]>>(
            "/api/messages/forward",
            { messageId, targetConversationIds },
        );
        return response.data;
    },

    /**
     * Mark message as seen.
     */
    markAsSeen: async (messageId: string): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/seen`,
        );
        return response.data;
    },

    /**
     * Recall message (only within 24 hours, cannot recall others' messages).
     */
    recall: async (messageId: string): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/recall`,
        );
        return response.data;
    },

    /**
     * Edit message content (TEXT only, within 15 minutes, cannot edit others' messages).
     */
    edit: async (
        messageId: string,
        content: string,
    ): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/edit`,
            { content },
        );
        return response.data;
    },

    /**
     * Delete message.
     */
    delete: async (messageId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(
            `/api/messages/${messageId}`,
        );
        return response.data;
    },

    react: async (messageId: string, emoji: string): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/react`,
            { emoji },
        );
        return response.data;
    },

    search: async (
        conversationId: string,
        keyword: string,
        page = 0,
        size = 20,
    ): Promise<ApiResponse<Message[]>> => {
        const response = await axiosClient.get<ApiResponse<Message[]>>(
            `/api/messages/conversation/${conversationId}/search`,
            { params: { keyword, page, size } },
        );
        return response.data;
    },

    // ── Poll Vote ───────────────────────────────────────────────────
    votePoll: async (messageId: string, optionIndex: number): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/vote`,
            { optionIndex },
        );
        return response.data;
    },

    // ── Close Poll ──────────────────────────────────────────────────
    closePoll: async (messageId: string): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/close-poll`,
        );
        return response.data;
    },

    // ── Pin / Unpin ─────────────────────────────────────────────────
    togglePin: async (messageId: string): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/pin`,
        );
        return response.data;
    },

    getPinnedMessages: async (conversationId: string): Promise<ApiResponse<Message[]>> => {
        const response = await axiosClient.get<ApiResponse<Message[]>>(
            `/api/messages/conversation/${conversationId}/pinned`,
        );
        return response.data;
    },

    // ── Tag Priority (Important / Urgent) ───────────────────────────
    tagPriority: async (messageId: string, priority: string): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/priority`,
            { priority },
        );
        return response.data;
    },
};
