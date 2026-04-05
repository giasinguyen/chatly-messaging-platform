import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';
import type { NotificationEvent } from '@/types/notification';

interface UseNotificationSocketProps {
  onEvent: (event: NotificationEvent) => void;
}

/**
 * Hook to subscribe to /user/queue/notifications for realtime notifications
 */
export function useNotificationSocket({ onEvent }: UseNotificationSocketProps) {
  const user = useAuthStore((s) => s.user);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let cleanupFn: (() => void) | undefined;

    const setup = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token || !isMounted) return;

      await socketService.connect(token);
      if (!isMounted) return;

      const sub = socketService.subscribe('/user/queue/notifications', (payload) => {
        const event = JSON.parse(payload.body) as NotificationEvent;
        callbackRef.current(event);
      });

      cleanupFn = () => sub?.unsubscribe();
    };

    setup().catch(console.error);

    return () => {
      isMounted = false;
      cleanupFn?.();
    };
  }, [user]);
}
