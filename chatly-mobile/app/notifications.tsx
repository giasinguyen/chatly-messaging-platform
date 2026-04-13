import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { notificationService } from '@/services/notification.service';
import { useNotificationStore } from '@/store/notification.store';
import type { NotificationResponse } from '@/types/notification';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setLocalNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getNotifications(0, 50);
      setLocalNotifications(res.result);
      
      // Calculate unread count manually for sync
      const unreadCount = res.result.filter(n => !n.read).length;
      setUnreadCount(unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setLocalNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationPress = async (notification: NotificationResponse) => {
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification.id);
        setLocalNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
        setUnreadCount(Math.max(0, notifications.filter(n => !n.read).length - 1));
      } catch (err) {
        console.error(err);
      }
    }

    if (notification.type === 'NEW_MESSAGE' && notification.referenceId) {
      router.push(`/chat/${notification.referenceId}`);
    } else if (notification.type === 'FRIEND_REQUEST') {
      router.push('/(tabs)/contacts');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_MESSAGE': return { name: 'chatbubble-ellipses', color: Colors.cta };
      case 'FRIEND_REQUEST': return { name: 'person-add', color: '#4CAF50' };
      default: return { name: 'notifications', color: Colors.textMuted };
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-bold" style={{ color: Colors.text }}>Notifications</Text>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={{ color: Colors.cta, fontWeight: '500' }}>Mark all read</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />}
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
                }}
              >
                <View className="relative">
                  <Avatar uri={item.senderAvatar} name={item.senderName || 'User'} size={48} />
                  <View 
                    className="absolute -bottom-1 -right-1 rounded-full p-1" 
                    style={{ backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}
                  >
                    <Ionicons name={icon.name as any} size={12} color={icon.color} />
                  </View>
                </View>
                
                <View className="ml-3 flex-1">
                  <View className="flex-row justify-between items-start">
                    <Text className={`flex-1 text-sm ${item.read ? 'font-normal' : 'font-bold'}`} style={{ color: Colors.text }}>
                      {item.content}
                    </Text>
                    {!item.read && (
                      <View className="w-2 h-2 rounded-full mt-1.5 ml-1" style={{ backgroundColor: Colors.cta }} />
                    )}
                  </View>
                  <Text className="text-xs mt-1" style={{ color: Colors.textMuted }}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Ionicons name="notifications-off-outline" size={64} color={Colors.borderLight} />
              <Text className="mt-4 text-base" style={{ color: Colors.textMuted }}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
