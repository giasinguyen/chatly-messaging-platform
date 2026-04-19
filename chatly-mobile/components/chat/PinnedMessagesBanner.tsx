import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Message } from '@/types/message';

interface PinnedMessagesBannerProps {
  pinnedMessages: Message[];
  currentIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onPress: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onViewAll?: () => void;
}

export function PinnedMessagesBanner({
  pinnedMessages,
  currentIdx,
  onPrev,
  onNext,
  onPress,
  onUnpin,
  onViewAll,
}: PinnedMessagesBannerProps) {
  if (pinnedMessages.length === 0) return null;
  const current = pinnedMessages[currentIdx];
  if (!current) return null;

  const preview =
    current.content ||
    (current.type === 'POLL' ? `Poll: ${current.poll?.question}` : '[attachment]');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FFF8E1',
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.borderLight,
        gap: 8,
      }}
    >
      <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="pin" size={14} color="#F59E0B" />
      </TouchableOpacity>

      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => onPress(current.id)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '600' }} numberOfLines={1}>
          Pinned {pinnedMessages.length > 1 ? `(${pinnedMessages.length})` : ''}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.text }} numberOfLines={1}>
          {preview}
        </Text>
      </TouchableOpacity>

      {pinnedMessages.length > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <TouchableOpacity onPress={onPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: Colors.textMuted }}>
            {currentIdx + 1}/{pinnedMessages.length}
          </Text>
          <TouchableOpacity onPress={onNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={() => onUnpin(current.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
