import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { formatRelativeTime, truncateText } from '@/utils/format';
import type { ConversationResponse } from '@/types/conversation';

interface ConversationItemProps {
  conversation: ConversationResponse;
  currentUserId: string;
  onPress: () => void;
  onLongPress?: () => void;
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string | undefined>;
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
  isPinned = false,
  isMuted = false,
}: ConversationItemProps) {
  const { type, name, avatarUrl, lastMessage, participantIds, updatedAt } = conversation;

  // Resolve display name
  let displayName = name ?? 'Conversation';
  let displayAvatar = avatarUrl;

  if (type === 'PRIVATE') {
    const otherId = participantIds.find((id) => id !== currentUserId);
    if (otherId) {
      displayName = participantNames[otherId] ?? 'User';
      displayAvatar = participantAvatars[otherId] ?? null;
    }
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
        preview = prefix + '📎 Attachment';
        break;
      case 'VIDEO':
        preview = prefix + '🎬 Video';
        break;
      case 'AUDIO':
        preview = prefix + '🎵 Audio';
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
      onLongPress={onLongPress}
      activeOpacity={0.7}
      className="flex-row items-center px-4 py-3"
      style={{
        backgroundColor: isPinned ? Colors.ctaLight : Colors.white,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 6 }}>
            {isPinned && (
              <Ionicons name="bookmark" size={13} color={Colors.cta} />
            )}
            {isMuted && (
              <Ionicons name="notifications-off-outline" size={13} color={Colors.textLight} />
            )}
            <Text className="text-xs" style={{ color: Colors.textMuted }}>
              {timeStr}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-0.5">
          <Text
            className="flex-1 text-sm"
            style={{ 
              color: conversation.unreadCount > 0 ? Colors.text : Colors.textMuted,
              fontWeight: conversation.unreadCount > 0 ? '600' : 'normal'
            }}
            numberOfLines={1}
          >
            {truncateText(preview, 35)}
          </Text>
          {conversation.unreadCount > 0 && (
            <View 
              className="ml-2 h-5 min-w-[20px] items-center justify-center rounded-full px-1.5"
              style={{ backgroundColor: Colors.cta }}
            >
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
