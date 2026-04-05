import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/auth.store';

export interface PresenceEvent {
  userId: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen: string | null;
}

interface UsePresenceSocketProps {
  onPresenceChange: (event: PresenceEvent) => void;
}

/**
 * Hook to subscribe to /topic/presence for online/offline status
 */
export function usePresenceSocket({ onPresenceChange }: UsePresenceSocketProps) {
  const user = useAuthStore((s) => s.user);
  const callbackRef = useRef(onPresenceChange);
  callbackRef.current = onPresenceChange;

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let cleanupFn: (() => void) | undefined;

    const setup = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token || !isMounted) return;

      await socketService.connect(token);
      if (!isMounted) return;

      const sub = socketService.subscribe('/topic/presence', (payload) => {
        const event: PresenceEvent = JSON.parse(payload.body);
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
