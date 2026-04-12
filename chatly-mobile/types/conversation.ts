export type ConversationType = 'PRIVATE' | 'GROUP';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO' | 'SYSTEM' | 'POLL' | 'VCARD';

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
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isMuted?: boolean;
  mutedUntil?: string | null;
  nickname?: string | null;
  allowMembersUpdateInfo?: boolean;
  requireApproval?: boolean;
  inviteToken?: string | null;
}
