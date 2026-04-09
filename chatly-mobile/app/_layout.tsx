import '../global.css';
import { useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth.store';
import { setupAxiosInterceptors } from '@/lib/axiosClient';
import { socketService } from '@/services/socket.service';
import { usePresenceSocket, PresenceEvent } from '@/hooks/usePresenceSocket';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useExpoPush } from '@/hooks/useExpoPush';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { notificationService } from '@/services/notification.service';
import { useNotificationStore } from '@/store/notification.store';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrated, hydrate, setAuth, clearAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  // Hydrate auth state from AsyncStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Setup axios interceptors
  useEffect(() => {
    setupAxiosInterceptors({
      onTokenRefreshed: (payload) => setAuth(payload),
      onLogout: () => clearAuth(),
    });
  }, [setAuth, clearAuth]);

  // Connect/disconnect WebSocket based on auth state
  useEffect(() => {
    if (!hydrated) return;

    if (isAuthenticated) {
      AsyncStorage.getItem('access_token').then((token) => {
        if (token) socketService.connect(token).catch(console.error);
      });
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, hydrated]);

  // Subscribe to presence events
  const handlePresenceChange = useCallback((event: PresenceEvent) => {
    // Store presence in a simple way - components can check this
    if (__DEV__) console.log('Presence:', event.userId, event.status);
  }, []);

  usePresenceSocket({ onPresenceChange: handlePresenceChange });
  useNotificationSocket();
  useExpoPush();

  // Fetch initial unread count
  useEffect(() => {
    if (isAuthenticated && hydrated) {
      notificationService.getUnreadCount()
        .then(res => setUnreadCount(res.result))
        .catch(err => console.error('Failed to fetch unread count', err));
    }
  }, [isAuthenticated, hydrated, setUnreadCount]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!hydrated) return;

    const inAuth = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)/chats');
    }
  }, [isAuthenticated, hydrated, segments, router]);

  // Show loading while hydrating
  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </View>
    );
  }

  return (
    <>
      <NotificationBanner />
      {children}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <Slot />
      </AuthGate>
    </SafeAreaProvider>
  );
}
