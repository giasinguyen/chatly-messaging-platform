import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import axiosClient from '@/lib/axiosClient';
import { useConversationPrefsStore, isConvMuted } from '@/store/conversationPrefs.store';

// Lazy load expo-notifications to avoid side-effect crash in Expo Go
let Notifications: any;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    // Configure how notifications are displayed when the app is in the foreground
    Notifications.setNotificationHandler({
      handleNotification: async (notification: any) => {
        const data = notification.request?.content?.data;
        if (data?.type === 'NEW_MESSAGE' && data?.referenceId) {
          const convPrefs = useConversationPrefsStore.getState().prefs[data.referenceId] ?? {};
          if (isConvMuted(convPrefs)) {
            return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
          }
        }
        return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
      },
    });
  } catch (e) {
    console.warn('Failed to load expo-notifications', e);
  }
}

export function useExpoPush() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || isExpoGo || !Notifications) return;

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        // Register token with backend
        axiosClient.post('/users/device-token', { token })
          .catch(err => console.error('Failed to register device token', err));
      }
    }).catch(err => {
      console.warn('Push notifications setup failed (Firebase/FCM may not be configured):', err);
      // App continues normally without FCM
    });

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      // In-app handling if needed
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const { type, referenceId } = response.notification.request.content.data;
      if (type === 'NEW_MESSAGE' && referenceId) {
        router.push(`/chat/${referenceId}`);
      } else if (type === 'FRIEND_REQUEST') {
        router.push('/(tabs)/contacts');
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, user?.id, isExpoGo]);
}

async function registerForPushNotificationsAsync() {
  if (isExpoGo || !Notifications) return null;
  
  try {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // Check if we have projectId for Expo push token
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  } catch (err) {
    console.warn('Failed to register push notif token (Firebase/FCM likely not configured):', err);
    return null;
  }
}
