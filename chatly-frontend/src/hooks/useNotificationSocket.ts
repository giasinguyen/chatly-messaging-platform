import { useEffect } from "react";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import type { NotificationEvent } from "@/types/notification";

interface UseNotificationSocketProps {
    onEvent: (event: NotificationEvent) => void;
}

export function useNotificationSocket({ onEvent }: UseNotificationSocketProps) {
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const setup = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            await socketService.connect(token);
            const client = socketService.getClient();

            if (!client || !isMounted) return;

            // Subscribe to the user-specific notification queue.
            // Spring maps /user/queue/notifications → user's own session channel.
            const sub = client.subscribe("/user/queue/notifications", (payload) => {
                const event = JSON.parse(payload.body) as NotificationEvent;
                onEvent(event);
            });

            return () => {
                sub.unsubscribe();
            };
        };

        const cleanupPromise = setup();

        return () => {
            isMounted = false;
            cleanupPromise.then((cleanup) => {
                if (cleanup) cleanup();
            });
        };
    }, [user, onEvent]);
}
