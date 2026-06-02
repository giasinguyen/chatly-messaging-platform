import { useEffect, useRef } from "react";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";

export interface PresenceEvent {
    userId: string;
    status: "ONLINE" | "OFFLINE";
    lastSeen: string | null;
}

interface UsePresenceSocketProps {
    onPresenceChange: (event: PresenceEvent) => void;
}

/**
 * Hook to subscribe to WebSocket topic /topic/presence
 * to update online/offline status in real-time.
 */
export function usePresenceSocket({
    onPresenceChange,
}: UsePresenceSocketProps) {
    const { user } = useAuthStore();
    const callbackRef = useRef(onPresenceChange);

    useEffect(() => {
        callbackRef.current = onPresenceChange;
    }, [onPresenceChange]);

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const setup = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            await socketService.connect(token);

            if (!isMounted) return;

            const unsubscribe = socketService.subscribe(
                "/topic/presence",
                (payload) => {
                    const event: PresenceEvent = JSON.parse(payload.body);
                    callbackRef.current(event);
                },
            );

            return () => {
                unsubscribe();
            };
        };

        const cleanupPromise = setup();

        return () => {
            isMounted = false;
            cleanupPromise.then((cleanup) => {
                if (cleanup) cleanup();
            });
        };
    }, [user]);
}
