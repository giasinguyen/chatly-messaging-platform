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

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        let isMounted = true;

        const setup = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            await socketService.connect(token);
            const client = socketService.getClient();

            if (!client || !isMounted) return;

            // Subscribe to the user-specific notification queue.
            // Spring maps /user/queue/notifications → user's own session channel.
            const sub = client.subscribe(
                "/user/queue/notifications",
                (payload) => {
                    const event = JSON.parse(payload.body) as NotificationEvent;
                    onEvent(event);

                    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
                        let title = "Chatly";
                        switch (event.notification.type) {
                            case "NEW_MESSAGE": title = "New message"; break;
                            case "FRIEND_REQUEST": title = "Friend request"; break;
                            case "GROUP_INVITE": title = "Group invitation"; break;
                        }
                        const options = {
                            body: event.notification.content || "You have a new notification",
                            icon: "/favicon.ico"
                        };
                        const notif = new window.Notification(title, options);
                        notif.onclick = () => {
                            window.focus();
                            if (event.notification.type === "FRIEND_REQUEST") {
                                window.location.href = "/contact?tab=requests";
                            } else if (event.notification.referenceId) {
                                window.location.href = `/chat/${event.notification.referenceId}`;
                            }
                            notif.close();
                        };
                    }
                },
            );

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
