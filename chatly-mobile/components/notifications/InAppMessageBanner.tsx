import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { getNotificationDisplayContent } from '@/utils/notificationDisplay';
import type { NotificationResponse } from '@/types/notification';

interface InAppMessageBannerProps {
  notification: NotificationResponse | null;
  onDismiss: () => void;
  onPress: (notification: NotificationResponse) => void;
}

const BANNER_DURATION_MS = 4200;
const HIDDEN_TRANSLATE_Y = -120;

function getNotificationIcon(
  type: NotificationResponse['type']
): ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'POST_LIKED':
      return 'heart';
    case 'POST_COMMENTED':
    case 'COMMENT_REPLIED':
      return 'chatbubble';
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return 'person-add';
    case 'GROUP_INVITE':
    case 'GROUP_UPDATED':
    case 'MEMBER_JOINED':
      return 'people';
    default:
      return 'notifications';
  }
}

export function InAppMessageBanner({ notification, onDismiss, onPress }: InAppMessageBannerProps) {
  const { t } = useTranslation();
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
        onPress={() => onPress(notification)}
        className="overflow-hidden rounded-2xl shadow-lg"
        style={{
          backgroundColor: Colors.bgCard,
          borderWidth: 1,
          borderColor: Colors.borderLight,
        }}>
        <View className="h-1" style={{ backgroundColor: Colors.cta }} />
        <View className="flex-row items-center px-3 py-3">
          <View className="relative">
            <Avatar
              uri={notification.senderAvatar}
              name={notification.senderName ?? 'Chatly'}
              size={40}
            />
            <View
              className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full"
              style={{ backgroundColor: Colors.cta, borderColor: Colors.bgCard, borderWidth: 2 }}>
              <Ionicons
                name={getNotificationIcon(notification.type)}
                size={10}
                color={Colors.white}
              />
            </View>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold" numberOfLines={1} style={{ color: Colors.text }}>
              {notification.senderName ?? 'New message'}
            </Text>
            <Text
              className="mt-0.5 text-xs leading-4"
              numberOfLines={2}
              style={{ color: Colors.textMuted }}>
              {getNotificationDisplayContent(notification)}
            </Text>
          </View>
          <View
            className="ml-2 flex-row items-center rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${Colors.cta}14` }}>
            <Text className="mr-1 text-xs font-semibold" style={{ color: Colors.cta }}>
              {t('mobile.chat.toast_open')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.cta} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
