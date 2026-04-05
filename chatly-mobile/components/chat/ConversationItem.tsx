import { View, Text, TouchableOpacity } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { formatRelativeTime, truncateText } from '@/utils/format';
import type { ConversationResponse } from '@/types/conversation';

interface ConversationItemProps {
  conversation: ConversationResponse;
  currentUserId: string;
  onPress: () => void;
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string | undefined>;
}

export function ConversationItem({
  conversation,
  currentUserId,
  onPress,
  participantNames = {},
  participantAvatars = {},
}: ConversationItemProps) {
  const { type, name, avatarUrl, lastMessage, participantIds, updatedAt } = conversation;

  // Resolve display name
  let displayName = name ?? 'Cuộc trò chuyện';
  let displayAvatar = avatarUrl;

  if (type === 'PRIVATE') {
    const otherId = participantIds.find((id) => id !== currentUserId);
    if (otherId) {
      displayName = participantNames[otherId] ?? 'Người dùng';
      displayAvatar = participantAvatars[otherId] ?? null;
    }
  }

  // Last message preview
  let preview = 'Chưa có tin nhắn';
  if (lastMessage) {
    const isMe = lastMessage.senderId === currentUserId;
    const prefix = isMe ? 'Bạn: ' : '';
    switch (lastMessage.type) {
      case 'IMAGE':
        preview = prefix + '📷 Hình ảnh';
        break;
      case 'FILE':
        preview = prefix + '📎 Tệp đính kèm';
        break;
      case 'VIDEO':
        preview = prefix + '🎬 Video';
        break;
      case 'AUDIO':
        preview = prefix + '🎵 Âm thanh';
        break;
      case 'SYSTEM':
        preview = lastMessage.content;
        break;
      default:
        preview = prefix + lastMessage.content;
    }
  }

  const timeStr = lastMessage
    ? formatRelativeTime(lastMessage.timestamp)
    : formatRelativeTime(updatedAt);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center px-4 py-3"
      style={{
        backgroundColor: Colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.borderLight,
      }}
    >
      <Avatar uri={displayAvatar} name={displayName} size={52} showOnline />

      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 text-base font-semibold"
            style={{ color: Colors.text }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text className="ml-2 text-xs" style={{ color: Colors.textMuted }}>
            {timeStr}
          </Text>
        </View>
        <Text
          className="mt-0.5 text-sm"
          style={{ color: Colors.textMuted }}
          numberOfLines={1}
        >
          {truncateText(preview, 40)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
