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

export interface Reaction {
    userId: string;
    emoji: string;
    createdAt: string;
}

export interface Poll {
    question: string;
    options: string[];
    multipleChoice: boolean;
    votes: Record<string, string[]>; // optionIndex -> userIds
    closed?: boolean;
}

/**
 * Message returned from API – matches 100% with MessageResponse.java.
 * API order: latest first (descending), needs reverse before rendering.
 */
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: MessageType;
    status: MessageStatus;
    replyToId: string | null;
    forwardedFromId: string | null;
    forwardedFromConversationId: string | null;
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

    // Reactions
    reactions: Reaction[];

    // Poll
    poll?: Poll | null;

    // Pin
    pinned: boolean;
    pinnedAt: string | null;
    pinnedBy: string | null;

    // Priority tag
    priority?: string | null; // "IMPORTANT" | "URGENT" | null

    // Mentions – user IDs mentioned in this message ("all" for @all)
    mentions?: string[];

    createdAt: string;
    updatedAt: string;
}

/**
 * ChatEvent – wrapper for all realtime message and group update events from WebSocket.
 */
export type ChatAction = "SEND" | "EDIT" | "RECALL" | "DELETE" | "GROUP_UPDATE" | "REACT";
export interface ChatEvent {
    action: ChatAction;
    message?: Message;
    conversationData?: ConversationResponse;
}

/**
 * ChatUser – display information of a participant in the conversation.
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
