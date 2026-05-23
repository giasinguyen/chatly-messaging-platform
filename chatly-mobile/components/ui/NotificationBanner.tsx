import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { useNotificationStore } from '@/store/notification.store';

export function NotificationBanner() {
  const { bannerNotification, hideBanner } = useNotificationStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (bannerNotification) {
      // Clear previous timeout if any
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Slide in
      Animated.spring(slideAnim, {
        toValue: insets.top + 10,
        useNativeDriver: true,
        speed: 12,
      }).start();

      // Auto dismiss after 3 seconds
      timeoutRef.current = setTimeout(() => {
        dismiss();
      }, 3000);
    }
  }, [bannerNotification, insets.top]);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      hideBanner();
    });
  };

  if (!bannerNotification) return null;

  const handlePress = () => {
    if (bannerNotification.type === 'NEW_MESSAGE' && bannerNotification.referenceId) {
      router.push({
        pathname: '/chat/[id]',
        params: { id: bannerNotification.referenceId, returnTo: 'chats' },
      });
    } else if (bannerNotification.type === 'FRIEND_REQUEST') {
      router.push('/(tabs)/contacts');
    }
    dismiss();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.content}
        className="flex-row items-center p-3 rounded-2xl shadow-lg"
      >
        <Avatar
          uri={bannerNotification.senderAvatar}
          name={bannerNotification.senderName || 'User'}
          size={44}
        />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-sm" style={{ color: Colors.text }}>
            {bannerNotification.type === 'NEW_MESSAGE' 
              ? `Message from ${bannerNotification.senderName}` 
              : 'Friend Request'}
          </Text>
          <Text 
            className="text-xs mt-0.5" 
            style={{ color: Colors.textLight }} 
            numberOfLines={1}
          >
            {bannerNotification.content}
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} className="p-1 px-2">
          <Text style={{ color: Colors.textMuted, fontSize: 18 }}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    zIndex: 9999,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
