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

    /**
     * Thu hồi tin nhắn (chỉ trong vòng 24 giờ, không thu hồi của người khác).
     */
    recall: async (messageId: string): Promise<ApiResponse<Message>> => {
        const response = await axiosClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}/recall`,
        );
        return response.data;
    },

    /**
     * Chỉnh sửa nội dung tin nhắn (chỉ TEXT, trong vòng 15 phút, không chỉnh sửa của người khác).
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
     * Xoá tin nhắn.
     */
    delete: async (messageId: string): Promise<ApiResponse<void>> => {
        const response = await axiosClient.delete<ApiResponse<void>>(
            `/api/messages/${messageId}`,
        );
        return response.data;
    },
};
