import { useEffect } from "react";
import i18n from "@/i18n";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import type { NotificationEvent } from "@/types/notification";
import { resolveNotificationRoute } from "@/utils/notificationRedirect";
import { useNotificationPrefsStore } from "@/store/notificationPrefs.store";

interface UseNotificationSocketProps {
    onEvent: (event: NotificationEvent) => void;
}

export function useNotificationSocket({ onEvent }: UseNotificationSocketProps) {
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;

        if (
            useNotificationPrefsStore.getState().browserNotificationsEnabled &&
            "Notification" in window &&
            Notification.permission === "default"
        ) {
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

                    if (
                        document.hidden &&
                        useNotificationPrefsStore.getState()
                            .browserNotificationsEnabled &&
                        "Notification" in window &&
                        Notification.permission === "granted"
                    ) {
                        let title = "Chatly";
                        switch (event.notification.type) {
                            case "NEW_MESSAGE":
                                title = i18n.t("notifications.new_message");
                                break;
                            case "FRIEND_REQUEST":
                                title = i18n.t("notifications.friend_request");
                                break;
                            case "FRIEND_ACCEPTED":
                                title = i18n.t(
                                    "notifications.friend_request_accepted",
                                );
                                break;
                            case "GROUP_INVITE":
                                title = i18n.t(
                                    "notifications.group_invitation",
                                );
                                break;
                            case "GROUP_UPDATED":
                                title = i18n.t("notifications.group_updated");
                                break;
                            case "GROUP_JOIN_REQUEST":
                                title = i18n.t(
                                    "notifications.new_join_request",
                                );
                                break;
                            case "MEMBER_JOINED":
                                title = i18n.t(
                                    "notifications.new_member_joined",
                                );
                                break;
                        }
                        const options = {
                            body:
                                event.notification.content ||
                                i18n.t("notifications.new_notification"),
                            icon: "/favicon.ico",
                        };
                        const notif = new window.Notification(title, options);
                        notif.onclick = () => {
                            window.focus();
                            window.location.href = resolveNotificationRoute(
                                event.notification,
                            );
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
