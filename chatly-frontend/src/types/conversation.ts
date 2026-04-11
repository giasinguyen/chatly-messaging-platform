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
    // User-specific metadata
    isPinned?: boolean;
    isMuted?: boolean;
    mutedUntil?: string | null; // ISO datetime or null for muted forever
    nickname?: string | null; // For PRIVATE conversations - custom name for the contact
    // Group settings
    allowMembersUpdateInfo?: boolean; // If true, all members can update group name/avatar; default true
    requireApproval?: boolean;
    inviteToken?: string | null;
}
