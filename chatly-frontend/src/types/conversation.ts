export type ConversationType = "PRIVATE" | "GROUP";

export type MessageType = "TEXT" | "IMAGE" | "FILE" | "STICKER" | "SYSTEM";

export interface LastMessage {
    senderId: string;
    content: string;
    type: MessageType;
    timestamp: string;
}

export interface ConversationResponse {
    id: string;
    type: ConversationType;
    name: string | null;
    avatarUrl: string | null;
    creatorId: string;
    participantIds: string[];
    lastMessage: LastMessage | null;
    createdAt: string;
    updatedAt: string;
}
