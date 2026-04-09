import type { MessageType, ConversationResponse } from "@/types/conversation";

export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export interface ReadReceipt {
    userId: string;
    readAt: string;
}

export interface Attachment {
    fileId?: string;
    url: string;
    name?: string;
    type?: string;
    size?: number;
}

export interface EditHistoryEntry {
    content: string;
    editedAt: string;
}

/**
 * Message trả về từ API – khớp 100% với MessageResponse.java.
 * Thứ tự API trả về: mới nhất trước (descending), cần reverse trước khi render.
 */
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: MessageType;
    status: MessageStatus;
    replyToId: string | null;
    attachments: Attachment[];
    readBy: ReadReceipt[];

    // Recall fields
    recalled: boolean;
    recalledAt: string | null;
    recalledBy: string | null;

    // Edit fields
    edited: boolean;
    editedAt: string | null;
    editHistory: EditHistoryEntry[];

    createdAt: string;
    updatedAt: string;
}

/**
 * ChatEvent – wrapper for all realtime message and group update events from WebSocket.
 */
export type ChatAction = "SEND" | "EDIT" | "RECALL" | "DELETE" | "GROUP_UPDATE";

export interface ChatEvent {
    action: ChatAction;
    message?: Message;
    conversationData?: ConversationResponse;
}

/**
 * ChatUser – thông tin hiển thị của một participant trong cuộc trò chuyện.
 */
export interface ChatUser {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    phone?: string;
    dob?: string;
    privacy?: {
        showPhone?: boolean;
        showDob?: boolean;
    };
}
