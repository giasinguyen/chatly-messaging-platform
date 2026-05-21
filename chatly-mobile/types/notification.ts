export type NotificationType =
  | 'NEW_MESSAGE'
  | 'FRIEND_REQUEST'
  | 'GROUP_INVITE'
  | 'GROUP_JOIN_REQUEST'
  | 'MEMBER_JOINED'
  | 'MENTION'
  | 'CALL_MISSED'
  | 'NEW_FOLLOWER'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'POST_SHARED'
  | 'POST_MENTION'
  | 'COMMENT_REPLIED'
  | 'STORY_VIEWED'
  | 'STORY_REACTED'
  | 'STORY_REPLIED'
  | 'SYSTEM';

export type NotificationScope = 'all' | 'chat' | 'social';

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
