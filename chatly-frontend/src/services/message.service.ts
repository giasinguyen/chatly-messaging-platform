import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { Message } from "@/types/message";

/**
 * MESSAGE SERVICE
 * Chứa các API liên quan đến Message.
 */
export const messageService = {
    /**
     * Lấy danh sách tin nhắn trong một conversation, có phân trang.
     * API trả về theo thứ tự mới nhất trước (descending).
     * Cần reverse() trước khi render để hiển thị cũ → mới.
     *
     * @param conversationId - ID của conversation
     * @param page           - Số trang, bắt đầu từ 0
     * @param size           - Số message mỗi trang
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
     * Gửi tin nhắn mới.
     */
    send: async (payload: {
        conversationId: string;
        content: string;
        type?: string;
        replyToId?: string | null;
    }): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.post<ApiResponse<Message>>(
            "/api/messages",
            payload,
        );
        return response.data;
    },

    /**
     * Đánh dấu tin nhắn đã đọc.
     */
    markAsSeen: async (messageId: string): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/seen`,
        );
        return response.data;
    },
};
