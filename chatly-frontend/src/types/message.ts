import type { MessageType } from "@/types/conversation";

export type MessageStatus = "SENT" | "DELIVERED" | "READ";

/**
 * Message trả về từ API (chuẩn backend).
 * Dùng type này thay thế mock Message cũ (senderId "me" → dùng useAuthStore).
 */
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: MessageType;
    status: MessageStatus;
    replyToId?: string | null;
    fileUrl?: string | null;
    createdAt: string;
    updatedAt?: string;
}

/**
 * ChatUser – thông tin hiển thị của một participant trong cuộc trò chuyện.
 * Dùng thay thế mock User cũ.
 */
export interface ChatUser {
    id: string;
    displayName: string;
    username: string;
    avatar?: string;
}
