import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { socketService } from "@/services/socket.service";
import { notificationService } from "@/services/notification.service";
import type { Notification, NotificationEvent, NotificationType } from "@/types/notification";
import {
    Bell,
    Check,
    Heart,
    MessageCircle,
    Reply,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { resolveNotificationRoute } from "@/utils/notificationRedirect";

function getIcon(type: NotificationType) {
    switch (type) {
        case "FRIEND_REQUEST": return <UserPlus className="h-4 w-4 text-brand" />;
        case "FRIEND_ACCEPTED": return <Users className="h-4 w-4 text-green-500" />;
        case "POST_LIKED":     return <Heart className="h-4 w-4 text-red-500" />;
        case "POST_COMMENTED": return <MessageCircle className="h-4 w-4 text-blue-500" />;
        case "COMMENT_REPLIED":return <Reply className="h-4 w-4 text-purple-500" />;
        case "NEW_MESSAGE":    return <MessageCircle className="h-4 w-4 text-green-500" />;
        case "MEMBER_JOINED":  return <Users className="h-4 w-4 text-indigo-500" />;
        default:               return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
}

function getColorClass(type: NotificationType) {
    switch (type) {
        case "FRIEND_REQUEST": return "bg-brand/5 border-brand/20";
        case "FRIEND_ACCEPTED": return "bg-green-50 border-green-200 dark:bg-green-950/20";
        case "POST_LIKED":     return "bg-red-50 border-red-200 dark:bg-red-950/20";
        case "POST_COMMENTED": return "bg-blue-50 border-blue-200 dark:bg-blue-950/20";
        case "COMMENT_REPLIED":return "bg-purple-50 border-purple-200 dark:bg-purple-950/20";
        default:               return "bg-muted/50 border-border";
    }
}

export function NotificationCenter() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { notifications, unreadCount, addNotification, setUnreadCount } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const showFriendRequestToast = useCallback((notif: Notification) => {
        const senderName = notif.content?.split(" đã")?.[0] ?? "Someone";
        toast(senderName + " sent you a friend request", {
            duration: 6000,
            icon: <UserPlus className="h-4 w-4 text-brand" />,
            action: {
                label: "View Requests",
                onClick: () => navigate("/contact?tab=requests"),
            },
        });
    }, [navigate]);

    const showGenericToast = useCallback((notif: Notification) => {
        toast.info(notif.content ?? `New ${notif.type.toLowerCase()} notification`, {
            duration: 3000,
        });
    }, []);

    const handleIncomingNotification = useCallback((event: NotificationEvent) => {
        addNotification(event.notification);
        setUnreadCount(event.unreadCount);

        if (event.notification.type === "FRIEND_REQUEST") {
            showFriendRequestToast(event.notification);
        } else {
            showGenericToast(event.notification);
        }

        // Browser push notification when tab is hidden
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            const browserNotif = new window.Notification("Chatly", {
                body: event.notification.content ?? "You have a new notification",
                icon: "/favicon.ico",
            });
            const redirectUrl = getRedirectUrl(event.notification);
            const redirectUrl = resolveNotificationRoute(event.notification);
            browserNotif.onclick = () => {
                window.focus();
                navigate(redirectUrl);
                browserNotif.close();
            };
        }
    }, [addNotification, setUnreadCount, showFriendRequestToast, showGenericToast, navigate]);

    // Real-time WebSocket subscription
    useEffect(() => {
        if (!user?.id) return;

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

            const subscription = client.subscribe(
                `/user/${user.id}/queue/notifications`,
                (message) => {
                    try {
                        const event = JSON.parse(message.body) as NotificationEvent;
                        if (isMounted) handleIncomingNotification(event);
                    } catch {
                        // Malformed notification payload — ignore silently
                    }
                },
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
    }, [user?.id, handleIncomingNotification]);

    // Load initial unread count on mount
    useEffect(() => {
        if (!user?.id) return;
        const load = async () => {
            setIsLoading(true);
            try {
                const [notifsRes, countRes] = await Promise.all([
                    notificationService.getNotifications(0, 20),
                    notificationService.getUnreadCount(),
                ]);
                if (notifsRes.code === 1000 && notifsRes.result) {
                    notifsRes.result.forEach((n) => addNotification(n));
                }
                if (countRes.code === 1000) {
                    setUnreadCount(countRes.result ?? 0);
                }
            } catch {
                // Non-critical — notifications panel will just be empty
            } finally {
                setIsLoading(false);
            }
        };
        void load();
    }, [user?.id, addNotification, setUnreadCount]);

    const handleNotificationClick = async (notif: Notification) => {
        setIsOpen(false);
        if (!notif.read) {
            await notificationService.markAsRead(notif.id);
        }
        navigate(resolveNotificationRoute(notif));
    };

    const handleMarkAllRead = async () => {
        await notificationService.markAllAsRead();
        setUnreadCount(0);
    };

    return (
        <div className="relative">
            <button
                id="notification-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                title="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    <div className="absolute right-0 top-12 w-96 bg-popover rounded-xl shadow-xl border border-border z-50">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-semibold text-foreground">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="flex items-center gap-1 text-xs text-brand hover:text-brand/80 transition-colors"
                                    >
                                        <Check className="h-3 w-3" /> Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-muted rounded-lg"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto divide-y divide-border">
                            {isLoading ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                            ) : (
                                notifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        type="button"
                                        onClick={() => void handleNotificationClick(notif)}
                                        className={cn(
                                            "w-full text-left p-4 hover:brightness-95 transition-all border-b border-border last:border-0",
                                            !notif.read && getColorClass(notif.type),
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground line-clamp-2">
                                                    {notif.content}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(notif.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notif.read && (
                                                <div className="h-2 w-2 bg-brand rounded-full mt-2 shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
