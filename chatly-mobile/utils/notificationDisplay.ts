import i18n from '@/lib/i18n';
import type { NotificationResponse } from '@/types/notification';

function getSenderName(notification: NotificationResponse): string {
  return notification.senderName?.trim() || i18n.t('profile.user_fallback');
}

export function getNotificationDisplayContent(notification: NotificationResponse): string {
  const name = getSenderName(notification);

  switch (notification.type) {
    case 'FRIEND_REQUEST':
      return i18n.t('notifications.message_friend_request', { name });
    case 'FRIEND_ACCEPTED':
      return i18n.t('notifications.message_friend_accepted', { name });
    case 'GROUP_INVITE':
      return i18n.t('notifications.message_group_invite', { name });
    case 'GROUP_LEAVE':
      return i18n.t('notifications.message_group_leave');
    case 'GROUP_UPDATED':
      return i18n.t('notifications.message_group_updated', { name });
    case 'MEMBER_JOINED':
      return i18n.t('notifications.message_member_joined', { name });
    case 'POST_LIKED':
      return i18n.t('notifications.message_post_liked', { name });
    case 'POST_COMMENTED':
      return i18n.t('notifications.message_post_commented', { name });
    case 'POST_SHARED':
      return i18n.t('notifications.message_post_shared', { name });
    case 'POST_MENTION':
      return i18n.t('notifications.message_post_mention', { name });
    case 'COMMENT_REPLIED':
      return i18n.t('notifications.message_comment_replied', { name });
    default:
      return notification.content?.trim() || i18n.t('notifications.type_new_message');
  }
}

export function getPostNotificationReferenceId(referenceId: string): string {
  return referenceId.split('_')[0] ?? referenceId;
}
