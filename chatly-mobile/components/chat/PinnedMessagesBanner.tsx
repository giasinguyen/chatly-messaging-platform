import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Message } from '@/types/message';
import { firstMeaningfulPreview } from '@/utils/format';

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
  const { t } = useTranslation();

  if (pinnedMessages.length === 0) return null;
  const current = pinnedMessages[currentIdx];
  if (!current) return null;

  const preview =
    firstMeaningfulPreview(current.content, 120) ||
    (current.type === 'POLL'
      ? t('mobile.chat.poll_preview', { question: current.poll?.question ?? '' })
      : t('mobile.chat.attachment_preview'));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 9,
        backgroundColor: Colors.ctaLight,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        gap: 8,
      }}>
      <TouchableOpacity
        onPress={onViewAll}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,113,227,0.12)',
        }}>
        <Ionicons name="pin" size={12} color={Colors.cta} />
      </TouchableOpacity>

      <TouchableOpacity style={{ flex: 1 }} onPress={() => onPress(current.id)} activeOpacity={0.7}>
        <Text style={{ fontSize: 11, color: Colors.cta, fontWeight: '700' }} numberOfLines={1}>
          {pinnedMessages.length > 1
            ? t('chat.pinned_count', { count: pinnedMessages.length })
            : t('chat.pinned_label')}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.textMuted }} numberOfLines={1}>
          {preview}
        </Text>
      </TouchableOpacity>

      {pinnedMessages.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            borderWidth: 1,
            borderColor: Colors.borderLight,
            borderRadius: 999,
            backgroundColor: Colors.bgCard,
            paddingHorizontal: 4,
            paddingVertical: 1,
          }}>
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
        onPress={onViewAll}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: Colors.borderLight,
          backgroundColor: Colors.bgCard,
        }}>
        <Ionicons name="list-outline" size={14} color={Colors.cta} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onUnpin(current.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
