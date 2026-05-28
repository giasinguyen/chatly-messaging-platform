import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import type { NotificationResponse } from '@/types/notification';

interface InAppMessageBannerProps {
  notification: NotificationResponse | null;
  onDismiss: () => void;
  onPress: (conversationId: string) => void;
}

const BANNER_DURATION_MS = 4200;
const HIDDEN_TRANSLATE_Y = -120;

function getMessagePreview(notification: NotificationResponse): string {
  const content = notification.content?.trim();
  return content || 'Sent a message';
}

export function InAppMessageBanner({
  notification,
  onDismiss,
  onPress,
}: InAppMessageBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(HIDDEN_TRANSLATE_Y)).current;

  useEffect(() => {
    if (!notification) {
      Animated.timing(translateY, {
        toValue: HIDDEN_TRANSLATE_Y,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.sequence([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.delay(BANNER_DURATION_MS),
      Animated.timing(translateY, {
        toValue: HIDDEN_TRANSLATE_Y,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onDismiss();
      }
    });
  }, [notification, onDismiss, translateY]);

  if (!notification) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        top: Math.max(insets.top, 10),
        zIndex: 999,
        transform: [{ translateY }],
      }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(notification.referenceId)}
        className="flex-row items-center rounded-2xl px-3 py-2.5 shadow-lg"
        style={{
          backgroundColor: Colors.bgCard,
          borderWidth: 1,
          borderColor: Colors.borderLight,
        }}>
        <Avatar
          uri={notification.senderAvatar}
          name={notification.senderName ?? 'Chatly'}
          size={38}
        />
        <View className="ml-2.5 flex-1">
          <Text className="text-sm font-semibold" numberOfLines={1} style={{ color: Colors.text }}>
            {notification.senderName ?? 'New message'}
          </Text>
          <Text className="mt-0.5 text-xs" numberOfLines={2} style={{ color: Colors.textMuted }}>
            {getMessagePreview(notification)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}
