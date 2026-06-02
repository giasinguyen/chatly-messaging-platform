import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import type {
  Notification,
  NotificationBehavior,
  NotificationResponse as ExpoNotificationResponse,
} from 'expo-notifications';
import { useAuthStore } from '@/store/auth.store';
import axiosClient from '@/lib/axiosClient';
import { useConversationPrefsStore, isConvMuted } from '@/store/conversationPrefs.store';
import type { NotificationType } from '@/types/notification';

// Lazy load expo-notifications to avoid side-effect crash in Expo Go
type NotificationsModule = typeof import('expo-notifications');
type NotificationSubscription = { remove: () => void };
type PushNotificationData = {
  type?: NotificationType;
  referenceId?: string;
};

let Notifications: NotificationsModule | null = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications') as NotificationsModule;
    // Configure how notifications are displayed when the app is in the foreground
    Notifications.setNotificationHandler({
      handleNotification: async (notification: Notification): Promise<NotificationBehavior> => {
        const data = notification.request?.content?.data as PushNotificationData | undefined;
        if (data?.type === 'NEW_MESSAGE' && data?.referenceId) {
          const convPrefs = useConversationPrefsStore.getState().prefs[data.referenceId] ?? {};
          if (isConvMuted(convPrefs)) {
            return {
              shouldShowAlert: false,
              shouldShowBanner: false,
              shouldShowList: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          }
        }
        return {
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });
  } catch (error: unknown) {
    console.warn('Failed to load expo-notifications', error);
  }
}

export function useExpoPush() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const notificationListener = useRef<NotificationSubscription | null>(null);
  const responseListener = useRef<NotificationSubscription | null>(null);

  useEffect(() => {
    const notifications = Notifications;
    if (!isAuthenticated || !user || isExpoGo || !notifications) return;

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          axiosClient
            .post('/api/users/device-token', { token })
            .catch((error: unknown) => console.error('Failed to register device token', error));
        }
      })
      .catch((error: unknown) => {
        console.warn(
          'Push notifications setup failed (Firebase/FCM may not be configured):',
          error
        );
      });

    notificationListener.current = notifications.addNotificationReceivedListener(() => {});

    responseListener.current = notifications.addNotificationResponseReceivedListener(
      (response: ExpoNotificationResponse) => {
        const data = response.notification.request.content.data as PushNotificationData;
        const { type, referenceId } = data;
        if (
          (type === 'NEW_MESSAGE' ||
            type === 'GROUP_INVITE' ||
            type === 'GROUP_UPDATED' ||
            type === 'MEMBER_JOINED') &&
          referenceId
        ) {
          router.push(`/chat/${referenceId}`);
        } else if (type === 'FRIEND_REQUEST' || type === 'FRIEND_ACCEPTED') {
          router.push('/(tabs)/contacts');
        } else if (
          (type === 'POST_LIKED' ||
            type === 'POST_COMMENTED' ||
            type === 'COMMENT_REPLIED' ||
            type === 'POST_SHARED' ||
            type === 'POST_MENTION') &&
          referenceId
        ) {
          router.push(`/post/${getPostReferenceId(referenceId)}`);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, router, user]);
}

function getPostReferenceId(referenceId: string): string {
  return referenceId.split('_')[0] ?? referenceId;
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  const notifications = Notifications;
  if (isExpoGo || !notifications) return null;

  try {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return null;
      }

      // Check if we have projectId for Expo push token
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

      token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
    } else {
      return null;
    }

    return token;
  } catch (error: unknown) {
    console.warn(
      'Failed to register push notif token (Firebase/FCM likely not configured):',
      error
    );
    return null;
  }
}
