export type NotificationType = 'NEW_MESSAGE' | 'FRIEND_REQUEST' | 'GROUP_INVITE' | 'GROUP_JOIN_REQUEST' | 'MEMBER_JOINED' | 'MENTION' | 'CALL_MISSED' | 'SYSTEM';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId: string;
  referenceId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationEvent {
  notification: NotificationResponse;
  unreadCount: number;
}
