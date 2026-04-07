export type NotificationType = 'NEW_MESSAGE' | 'FRIEND_REQUEST' | 'GROUP_INVITE' | 'SYSTEM';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  senderId: string;
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
