import '../global.css';
import { useEffect, useCallback, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '@/store/auth.store';
import { setupAxiosInterceptors } from '@/lib/axiosClient';
import { isSocketAuthError, socketService } from '@/services/socket.service';
import { usePresenceSocket, PresenceEvent } from '@/hooks/usePresenceSocket';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useExpoPush } from '@/hooks/useExpoPush';
import { CallSocketProvider, useCallContext } from '@/contexts/CallContext';
import { useCallStore } from '@/store/call.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { IS_CALL_ENABLED } from '@/constants/runtime';
import { notificationService } from '@/services/notification.service';
import { useNotificationStore } from '@/store/notification.store';
import { useThemeStore } from '@/store/theme.store';
import { getThemeColors } from '@/utils/themeColors';
import { InAppMessageBanner } from '@/components/notifications/InAppMessageBanner';
import type { NotificationResponse } from '@/types/notification';
import { hydrateI18nLanguage } from '@/lib/i18n';

const CallScreenComponent = IS_CALL_ENABLED
  ? require('@/components/call/CallScreen').CallScreen
  : null;
const GroupCallScreenComponent = IS_CALL_ENABLED
  ? require('@/components/call/GroupCallScreen').GroupCallScreen
  : null;
const OutgoingCallScreenComponent = IS_CALL_ENABLED
  ? require('@/components/call/OutgoingCallScreen').OutgoingCallScreen
  : null;
const ActiveCallOverlayComponent = IS_CALL_ENABLED
  ? require('@/components/call/ActiveCallOverlay').ActiveCallOverlay
  : null;
const GroupCallOverlayComponent = IS_CALL_ENABLED
  ? require('@/components/call/GroupCallOverlay').GroupCallOverlay
  : null;

void SplashScreen.preventAutoHideAsync();

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrated, hydrate, setAuth, clearAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const setScopedUnreadCount = useNotificationStore((s) => s.setScopedUnreadCount);
  const [foregroundMessage, setForegroundMessage] = useState<NotificationResponse | null>(null);

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
        if (token) {
          socketService.connect(token).catch((error: unknown) => {
            if (!isSocketAuthError(error)) {
              console.error(error);
            }
          });
        }
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
  const handleForegroundMessage = useCallback((notification: NotificationResponse) => {
    setForegroundMessage(notification);
  }, []);

  const handleDismissForegroundMessage = useCallback(() => {
    setForegroundMessage(null);
  }, []);

  const handleOpenForegroundMessage = useCallback(
    (notification: NotificationResponse) => {
      setForegroundMessage(null);
      if (
        notification.type === 'NEW_MESSAGE' ||
        notification.type === 'GROUP_INVITE' ||
        notification.type === 'GROUP_UPDATED' ||
        notification.type === 'MEMBER_JOINED'
      ) {
        router.push(`/chat/${notification.referenceId}`);
        return;
      }

      if (notification.type === 'FRIEND_REQUEST' || notification.type === 'FRIEND_ACCEPTED') {
        router.push('/(tabs)/contacts');
        return;
      }

      if (
        notification.type === 'POST_LIKED' ||
        notification.type === 'POST_COMMENTED' ||
        notification.type === 'POST_SHARED' ||
        notification.type === 'POST_MENTION' ||
        notification.type === 'COMMENT_REPLIED'
      ) {
        router.push(`/post/${notification.referenceId.split('_')[0] ?? notification.referenceId}`);
      }
    },
    [router]
  );

  useNotificationSocket({ onForegroundMessage: handleForegroundMessage });
  useExpoPush();

  // Initialize signaling WebSocket for calls (active on all screens)
  const { answerCall: answerCallAction, joinGroupCall } = useCallContext();
  const incomingCall = useCallStore((s) => s.incomingCall);
  const incomingGroupCall = useCallStore((s) => s.incomingGroupCall);
  const callStatus = useCallStore((s) => s.callStatus);
  const isGroupCall = useCallStore((s) => s.isGroupCall);

  // Fetch initial unread counts for each notification entry point.
  useEffect(() => {
    if (isAuthenticated && hydrated) {
      Promise.all([
        notificationService.getUnreadCount('all'),
        notificationService.getUnreadCount('chat'),
        notificationService.getUnreadCount('social'),
      ])
        .then(([all, chat, social]) => {
          setScopedUnreadCount('all', all.result);
          setScopedUnreadCount('chat', chat.result);
          setScopedUnreadCount('social', social.result);
        })
        .catch((err) => console.error('Failed to fetch unread count', err));
    }
  }, [isAuthenticated, hydrated, setScopedUnreadCount]);

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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.bg,
        }}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </View>
    );
  }

  return (
    <>
      {children}

      <InAppMessageBanner
        notification={foregroundMessage}
        onDismiss={handleDismissForegroundMessage}
        onPress={handleOpenForegroundMessage}
      />

      {/* Incoming 1-1 call screen */}
      {IS_CALL_ENABLED &&
        CallScreenComponent &&
        incomingCall &&
        callStatus === 'RINGING' &&
        !incomingGroupCall && (
          <CallScreenComponent
            visible
            incomingCall={incomingCall}
            onAccept={() => answerCallAction(true)}
            onReject={() => answerCallAction(false)}
          />
        )}

      {/* Incoming group call screen (receiver side) */}
      {IS_CALL_ENABLED &&
        GroupCallScreenComponent &&
        incomingGroupCall &&
        callStatus === 'RINGING' && (
          <GroupCallScreenComponent
            visible
            incomingGroupCall={incomingGroupCall}
            onJoin={() => joinGroupCall(true)}
            onDecline={() => joinGroupCall(false)}
          />
        )}

      {/* Outgoing 1-1 call screen (caller side only) */}
      {IS_CALL_ENABLED && OutgoingCallScreenComponent ? <OutgoingCallScreenComponent /> : null}

      {/* Active group call overlay — also covers initiator RINGING state */}
      {IS_CALL_ENABLED &&
        GroupCallOverlayComponent &&
        isGroupCall &&
        !incomingGroupCall &&
        (callStatus === 'ONGOING' || callStatus === 'RINGING') && <GroupCallOverlayComponent />}

      {/* Active 1-1 call overlay */}
      {IS_CALL_ENABLED &&
        ActiveCallOverlayComponent &&
        callStatus === 'ONGOING' &&
        !isGroupCall && <ActiveCallOverlayComponent />}
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <CallSocketProvider>
      <AuthGateInner>{children}</AuthGateInner>
    </CallSocketProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });
  const [i18nReady, setI18nReady] = useState(false);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const palette = getThemeColors(isDarkMode);

  useEffect(() => {
    void Promise.all([hydrateTheme(), hydrateI18nLanguage()]).finally(() => {
      setI18nReady(true);
    });
  }, [hydrateTheme]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore splash hide race conditions during startup.
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || !i18nReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={palette.background} />
      <AuthGate>
        <Slot />
      </AuthGate>
    </SafeAreaProvider>
  );
}
