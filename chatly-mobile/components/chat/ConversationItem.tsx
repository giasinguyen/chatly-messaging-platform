import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import {
  firstMeaningfulPreview,
  formatRelativeTime,
  richTextToPlainText,
  truncateText,
} from '@/utils/format';
import { formatSystemMessage } from '@/utils/systemMessage';
import type { ConversationResponse } from '@/types/conversation';

interface ConversationItemProps {
  conversation: ConversationResponse;
  currentUserId: string;
  onPress: () => void;
  onLongPress?: () => void;
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string | undefined>;
  onlineUserIds?: Set<string>;
  isPinned?: boolean;
  isMuted?: boolean;
}

export function ConversationItem({
  conversation,
  currentUserId,
  onPress,
  onLongPress,
  participantNames = {},
  participantAvatars = {},
  onlineUserIds = new Set(),
  isPinned = false,
  isMuted = false,
}: ConversationItemProps) {
  const { t } = useTranslation();
  const { type, name, avatarUrl, lastMessage, participantIds, updatedAt } = conversation;

  // Resolve display name
  let displayName = name ?? 'Conversation';
  let displayAvatar = avatarUrl;
  let isOnline = false;

  if (type === 'PRIVATE') {
    const otherId = participantIds.find((id) => id !== currentUserId);
    if (otherId) {
      displayName = participantNames[otherId] ?? 'User';
      displayAvatar = participantAvatars[otherId] ?? null;
      isOnline = onlineUserIds.has(otherId);
    }
  } else {
    // Group: online if any other member is online
    isOnline = participantIds.some((pid) => pid !== currentUserId && onlineUserIds.has(pid));
  }

  // Last message preview
  let preview = 'No messages yet';
  if (lastMessage) {
    const isMe = lastMessage.senderId === currentUserId;
    const prefix = isMe ? 'You: ' : '';
    switch (lastMessage.type) {
      case 'IMAGE':
        preview = prefix + '📷 Image';
        break;
      case 'FILE':
        preview =
          prefix + '📎 ' + (firstMeaningfulPreview(lastMessage.content || '', 35) || 'Attachment');
        break;
      case 'VIDEO':
        preview =
          prefix + '🎬 ' + (firstMeaningfulPreview(lastMessage.content || '', 35) || 'Video');
        break;
      case 'AUDIO':
        preview =
          prefix + '🎵 ' + (firstMeaningfulPreview(lastMessage.content || '', 35) || 'Audio');
        break;
      case 'GIF':
        preview = prefix + '🎬 GIF';
        break;
      case 'STICKER':
        preview = prefix + '🎨 Sticker';
        break;
      case 'VCARD':
        preview = prefix + '📇 Contact card';
        break;
      case 'SYSTEM':
        preview = firstMeaningfulPreview(formatSystemMessage(lastMessage.content), 35);
        break;
      case 'CALL': {
        let callData: { callType?: string; status?: string } = {};
        try {
          callData = JSON.parse(lastMessage.content);
        } catch {
          /* ignore */
        }
        const missed = callData.status === 'MISSED' || callData.status === 'REJECTED';
        const video = callData.callType === 'VIDEO';
        preview =
          prefix +
          (missed
            ? video
              ? t('chat.missed_video_call')
              : t('chat.missed_audio_call')
            : video
              ? t('chat.video_call')
              : t('chat.audio_call'));
        break;
      }
      default:
        preview = prefix + firstMeaningfulPreview(lastMessage.content, 35);
    }
  }

  const timeStr = lastMessage
    ? formatRelativeTime(lastMessage.timestamp)
    : formatRelativeTime(updatedAt);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      className="flex-row items-center px-4 py-3"
      style={{
        backgroundColor: isPinned ? Colors.ctaLight : Colors.bgCard,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.borderLight,
      }}>
      <Avatar uri={displayAvatar} name={displayName} size={52} showOnline isOnline={isOnline} />

      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 text-base font-semibold"
            style={{ color: Colors.text }}
            numberOfLines={1}>
            {displayName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 6 }}>
            {isPinned && <Ionicons name="bookmark" size={13} color={Colors.cta} />}
            {isMuted && (
              <Ionicons name="notifications-off-outline" size={13} color={Colors.textLight} />
            )}
            <Text className="text-xs" style={{ color: Colors.textMuted }}>
              {timeStr}
            </Text>
          </View>
        </View>
        <View className="mt-0.5 flex-row items-center justify-between">
          <Text
            className="flex-1 text-sm"
            style={{
              color: conversation.unreadCount > 0 ? Colors.text : Colors.textMuted,
              fontWeight: conversation.unreadCount > 0 ? '600' : 'normal',
            }}
            numberOfLines={1}>
            {truncateText(richTextToPlainText(preview), 35)}
          </Text>
          {conversation.unreadCount > 0 && (
            <View
              className="ml-2 h-5 min-w-[20px] items-center justify-center rounded-full px-1.5"
              style={{ backgroundColor: Colors.cta }}>
              <Text className="text-[10px] font-bold text-white">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
