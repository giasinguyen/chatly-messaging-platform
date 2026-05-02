import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { socketService } from "@/services/socket.service";
import { notificationService } from "@/services/notification.service";
import type { NotificationEvent } from "@/types/notification";
import { Bell, X, Heart, MessageCircle, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function NotificationCenter() {
    const { user } = useAuthStore();
    const { notifications, unreadCount, addNotification, setUnreadCount } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!user?.id) return;

        let isMounted = true;

        const setup = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            // Wait for socket to connect
            await socketService.connect(token);
            const client = socketService.getClient();
            if (!client || !isMounted) return;

            // Subscribe to notifications
            const subscription = client.subscribe(
                `/user/${user.id}/queue/notifications`,
                (message) => {
                    try {
                        const event = JSON.parse(message.body) as NotificationEvent;
                        if (isMounted) {
                            addNotification(event.notification);
                            setUnreadCount(event.unreadCount);
                            showNotificationToast(event.notification);
                        }
                    } catch (error) {
                        console.error("Failed to parse notification", error);
                    }
                }
            );

            return () => subscription.unsubscribe();
        };

        const cleanupPromise = setup();

        return () => {
            isMounted = false;
            cleanupPromise.then((cleanup) => {
                if (cleanup) cleanup();
            });
        };
    }, [user?.id, addNotification, setUnreadCount]);

    // Load initial notifications
    useEffect(() => {
        const loadNotifications = async () => {
            if (!user?.id) return;
            setIsLoading(true);
            try {
                const res = await notificationService.getNotifications(0, 20);
                if (res.code === 1000) {
                    const notifs = res.result || [];
                }
                const countRes = await notificationService.getUnreadCount();
                if (countRes.code === 1000) {
                    setUnreadCount(countRes.result || 0);
                }
            } catch (error) {
                console.error("Failed to load notifications", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadNotifications();
    }, [user?.id, setUnreadCount]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "POST_LIKED":
                return <Heart className="h-4 w-4 text-red-500" />;
            case "POST_COMMENTED":
                return <MessageCircle className="h-4 w-4 text-blue-500" />;
            case "COMMENT_REPLIED":
                return <Reply className="h-4 w-4 text-purple-500" />;
            default:
                return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case "POST_LIKED":
                return "bg-red-50 border-red-200";
            case "POST_COMMENTED":
                return "bg-blue-50 border-blue-200";
            case "COMMENT_REPLIED":
                return "bg-purple-50 border-purple-200";
            default:
                return "bg-gray-50 border-gray-200";
        }
    };

    const showNotificationToast = (notification: any) => {
        const message = notification.content || `New ${notification.type.toLowerCase()} notification`;
        toast.info(message, {
            duration: 3000,
        });
    };

    const handleNotificationClick = async (notificationId: string) => {
        await notificationService.markAsRead(notificationId);
    };

    return (
        <div className="relative">
            {/* Notification Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                title="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-gray-100 rounded-lg"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-500">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No notifications</div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif.id)}
                                    className={cn(
                                        "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                                        !notif.read && "bg-blue-50",
                                        getNotificationColor(notif.type)
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        {getNotificationIcon(notif.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">
                                                {notif.senderName}
                                            </p>
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {notif.content}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(notif.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
