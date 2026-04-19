import type { MessageType } from '@/types/conversation';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

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
  durationSeconds?: number;
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
  votes: Record<string, string[]>;
  closed?: boolean;
  deadline?: string;
  anonymous?: boolean;
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  address?: string;
  mapSnapshotUrl?: string;
}

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
  recalled: boolean;
  recalledAt: string | null;
  recalledBy: string | null;
  edited: boolean;
  editedAt: string | null;
  editHistory: EditHistoryEntry[];
  reactions: Reaction[];
  poll?: Poll | null;
  location?: LocationPayload;
  pinned: boolean;
  pinnedAt: string | null;
  pinnedBy: string | null;
  priority?: string | null;
  mentions?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ChatAction = 'SEND' | 'EDIT' | 'RECALL' | 'DELETE' | 'GROUP_UPDATE' | 'REACT';

export interface ChatEvent {
  action: ChatAction;
  message: Message;
}
