import type { NotificationScope, NotificationType } from '@/types/notification';

const CHAT_NOTIFICATION_TYPES = new Set<NotificationType>([
  'NEW_MESSAGE',
  'MENTION',
  'GROUP_INVITE',
  'GROUP_JOIN_REQUEST',
  'MEMBER_JOINED',
  'CALL_MISSED',
]);

const SOCIAL_NOTIFICATION_TYPES = new Set<NotificationType>([
  'POST_LIKED',
  'POST_COMMENTED',
  'POST_SHARED',
  'POST_MENTION',
  'COMMENT_REPLIED',
  'STORY_VIEWED',
  'STORY_REACTED',
  'STORY_REPLIED',
]);

export function getNotificationScope(type: NotificationType): NotificationScope | null {
  if (CHAT_NOTIFICATION_TYPES.has(type)) {
    return 'chat';
  }

  if (SOCIAL_NOTIFICATION_TYPES.has(type)) {
    return 'social';
  }

  return null;
}
