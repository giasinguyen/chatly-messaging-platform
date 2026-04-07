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
}

export interface EditHistoryEntry {
  content: string;
  editedAt: string;
}

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
  recalled: boolean;
  recalledAt: string | null;
  recalledBy: string | null;
  edited: boolean;
  editedAt: string | null;
  editHistory: EditHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type ChatAction = 'SEND' | 'EDIT' | 'RECALL' | 'DELETE';

export interface ChatEvent {
  action: ChatAction;
  message: Message;
}
