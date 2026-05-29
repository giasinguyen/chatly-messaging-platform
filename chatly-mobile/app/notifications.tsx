import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { notificationService } from '@/services/notification.service';
import { useNotificationStore } from '@/store/notification.store';
import type {
  NotificationResponse,
  NotificationScope,
  NotificationType,
} from '@/types/notification';

interface NotificationIcon {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function parseNotificationScope(scopeParam: string | string[] | undefined): NotificationScope {
  const scope = Array.isArray(scopeParam) ? scopeParam[0] : scopeParam;
  return scope === 'social' ? scope : 'all';
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scope: scopeParam } = useLocalSearchParams<{ scope?: string | string[] }>();
  const requestedScope = Array.isArray(scopeParam) ? scopeParam[0] : scopeParam;
  const scope = parseNotificationScope(scopeParam);
  const [notifications, setLocalNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const markNotificationAsRead = useNotificationStore((s) => s.markAsRead);
  const markScopeAsRead = useNotificationStore((s) => s.markScopeAsRead);

  const fetchNotifications = useCallback(async () => {
    if (requestedScope === 'chat') return;

    try {
      const response = await notificationService.getNotifications(0, 50, scope);
      await notificationService.markAllAsRead(scope);
      setLocalNotifications(
        response.result.map((notification) => ({ ...notification, read: true }))
      );
      markScopeAsRead(scope);
    } catch (error: unknown) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [markScopeAsRead, requestedScope, scope]);

  useEffect(() => {
    if (requestedScope === 'chat') {
      router.replace('/(tabs)/chats');
      return;
    }

    fetchNotifications();
  }, [fetchNotifications, requestedScope, router]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(scope);
      setLocalNotifications(notifications.map((n) => ({ ...n, read: true })));
      markScopeAsRead(scope);
    } catch (error: unknown) {
      console.error(error);
    }
  };

  const handleNotificationPress = async (notification: NotificationResponse) => {
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification.id);
        setLocalNotifications(
          notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        markNotificationAsRead(notification.id);
      } catch (error: unknown) {
        console.error(error);
      }
    }

    if (notification.type === 'NEW_MESSAGE' && notification.referenceId) {
      router.push({
        pathname: '/chat/[id]',
        params: { id: notification.referenceId, returnTo: 'notifications' },
      });
    } else if (notification.type === 'FRIEND_REQUEST') {
      router.push('/(tabs)/contacts');
    } else if (notification.type === 'GROUP_JOIN_REQUEST' && notification.referenceId) {
      router.push(`/chat/${notification.referenceId}/pending-requests`);
    } else if (notification.type === 'MEMBER_JOINED' && notification.referenceId) {
      router.push({
        pathname: '/chat/[id]',
        params: { id: notification.referenceId, returnTo: 'notifications' },
      });
    }
  };

  const getIcon = (type: NotificationType): NotificationIcon => {
    switch (type) {
      case 'NEW_MESSAGE':
        return { name: 'chatbubble-ellipses', color: Colors.cta };
      case 'FRIEND_REQUEST':
        return { name: 'person-add', color: '#4CAF50' };
      case 'GROUP_JOIN_REQUEST':
        return { name: 'person-add', color: '#FF9800' };
      case 'MEMBER_JOINED':
        return { name: 'people', color: '#2196F3' };
      case 'CALL_MISSED':
        return { name: 'call', color: '#F44336' };
      case 'POST_LIKED':
        return { name: 'heart', color: '#FF3B30' };
      case 'POST_COMMENTED':
        return { name: 'chatbubble', color: Colors.cta };
      case 'COMMENT_REPLIED':
        return { name: 'chatbubbles', color: Colors.cta };
      case 'POST_SHARED':
        return { name: 'paper-plane', color: '#34C759' };
      case 'POST_MENTION':
        return { name: 'at', color: '#AF52DE' };
      case 'STORY_VIEWED':
        return { name: 'eye', color: '#5856D6' };
      case 'STORY_REACTED':
        return { name: 'happy', color: '#FF9500' };
      case 'STORY_REPLIED':
        return { name: 'return-down-back', color: Colors.cta };
      default:
        return { name: 'notifications', color: Colors.textMuted };
    }
  };

  const title = t('notifications.title');

  const handleBack = () => {
    if (scope === 'social') {
      router.replace('/(tabs)/home');
      return;
    }

    if (scope === 'chat') {
      router.replace('/(tabs)/chats');
      return;
    }

    router.back();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: Colors.white,
          borderBottomWidth: 0.5,
          borderBottomColor: Colors.borderLight,
        }}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={handleBack} className="p-1">
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-bold" style={{ color: Colors.text }}>
            {title}
          </Text>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={{ color: Colors.cta, fontWeight: '500' }}>
              {t('notifications.mark_all_read')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.cta} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />
          }
          renderItem={({ item }) => {
            const icon = getIcon(item.type);
            return (
              <TouchableOpacity
                onPress={() => handleNotificationPress(item)}
                className="flex-row items-center px-4 py-4"
                style={{
                  backgroundColor: item.read ? Colors.white : '#F0F7FF',
                  borderBottomWidth: 0.5,
                  borderBottomColor: Colors.borderLight,
                }}>
                <View className="relative">
                  <Avatar uri={item.senderAvatar} name={item.senderName || t('profile.user_fallback')} size={48} />
                  <View
                    className="absolute -bottom-1 -right-1 rounded-full p-1"
                    style={{
                      backgroundColor: Colors.white,
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }}>
                    <Ionicons name={icon.name} size={12} color={icon.color} />
                  </View>
                </View>

                <View className="ml-3 flex-1">
                  <View className="flex-row items-start justify-between">
                    <Text
                      className={`flex-1 text-sm ${item.read ? 'font-normal' : 'font-bold'}`}
                      style={{ color: Colors.text }}>
                      {item.content}
                    </Text>
                    {!item.read && (
                      <View
                        className="ml-1 mt-1.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: Colors.cta }}
                      />
                    )}
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: Colors.textMuted }}>
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    • {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="notifications-off-outline" size={64} color={Colors.borderLight} />
              <Text className="mt-4 text-base" style={{ color: Colors.textMuted }}>
                {t('notifications.empty_short')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
