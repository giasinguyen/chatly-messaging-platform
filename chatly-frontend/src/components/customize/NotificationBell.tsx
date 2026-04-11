import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, MessageCircle, UserPlus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/notification.service";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { useConversationPrefsStore } from "@/store/conversationPrefs.store";
import type { Notification, NotificationEvent } from "@/types/notification";

export function NotificationBell() {
    const { user } = useAuthStore();
    const {
        notifications,
        loading,
        setNotifications,
        setLoading,
        addNotification,
        markOneRead,
        markAllRead,
    } = useNotificationStore();
    const convPrefs = useConversationPrefsStore((s) => s.prefs);
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // ----- Load initial data -----
    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                const notifRes = await notificationService.getNotifications(0, 20);
                if (!cancelled) {
                    setNotifications(notifRes.result ?? []);
                }
            } catch {
                // silently fail — non-critical UI
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [user, setNotifications, setLoading]);

    // ----- Real-time WebSocket events -----
    const handleNotificationEvent = useCallback((event: NotificationEvent) => {
        addNotification(event.notification);
        if (event.notification.type === "NEW_MESSAGE") {
            const convId = event.notification.referenceId ?? "";
            const isMuted = convPrefs[convId]?.isMuted ?? false;
            if (!isMuted) {
                new Audio("/sounds/message_ting_ting.mp3").play().catch(() => {});
            }
        }
    }, [addNotification, convPrefs]);

    useNotificationSocket({ onEvent: handleNotificationEvent });

    // ----- Split counts by type -----
    const unreadOtherCount = useMemo(
        () => notifications.filter((n) => n.type !== "NEW_MESSAGE" && !n.read).length,
        [notifications],
    );
    const otherNotifications = useMemo(
        () => notifications.filter((n) => n.type !== "NEW_MESSAGE"),
        [notifications],
    );

    // ----- Close dropdown when clicking outside -----
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // ----- Mark single notification as read -----
    const handleMarkRead = useCallback(async (notif: Notification) => {
        if (notif.read) return;
        try {
            await notificationService.markAsRead(notif.id);
            markOneRead(notif.id);
        } catch {
            // silently fail
        }
    }, [markOneRead]);

    // ----- Mark all as read -----
    const handleMarkAllRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            markAllRead();
        } catch {
            // silently fail
        }
    }, [markAllRead]);

    const handleNotificationClick = useCallback(async (notif: Notification) => {
        await handleMarkRead(notif);
        setOpen(false);
        if (notif.type === "FRIEND_REQUEST") {
            navigate("/contact?tab=requests");
        } else if (notif.type === "GROUP_INVITE" && notif.referenceId) {
            navigate(`/chat/${notif.referenceId}`);
        }
    }, [handleMarkRead, navigate]);

    const getIcon = (type: Notification["type"]) => {
        switch (type) {
            case "NEW_MESSAGE": return <MessageCircle size={14} className="text-brand" />;
            case "FRIEND_REQUEST": return <UserPlus size={14} className="text-green-500" />;
            case "GROUP_INVITE": return <Users size={14} className="text-purple-500" />;
            default: return <Bell size={14} className="text-muted-foreground" />;
        }
    };

    const getLabel = (type: Notification["type"]) => {
        switch (type) {
            case "NEW_MESSAGE": return "Tin nhắn mới";
            case "FRIEND_REQUEST": return "Lời mời kết bạn";
            case "GROUP_INVITE": return "Thêm vào nhóm";
            default: return "Thông báo";
        }
    };

    const formatTime = (createdAt: string) => {
        const diff = Date.now() - new Date(createdAt).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return "vừa xong";
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    return (
        <div className="relative w-full flex justify-center" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen((v) => !v)}
                title="Thông báo"
                className={cn(
                    "w-full flex justify-center py-3 relative transition-colors hover:bg-black/10 text-white/70",
                    open && "bg-black/20",
                )}
            >
                <Bell className="h-6 w-6 transition-colors" />
                {unreadOtherCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-4.5 h-4.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                        {unreadOtherCount > 99 ? "99+" : unreadOtherCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute left-full top-0 ml-2 w-80 bg-background border border-border rounded-xl shadow-2xl z-50 flex flex-col max-h-120 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                        <span className="font-semibold text-sm text-foreground">
                            Thông báo
                            {unreadOtherCount > 0 && (
                                <span className="ml-2 text-[11px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">
                                    {unreadOtherCount} chưa đọc
                                </span>
                            )}
                        </span>
                        <div className="flex items-center gap-1">
                            {unreadOtherCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    title="Đánh dấu tất cả đã đọc"
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <CheckCheck size={14} />
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="flex flex-col gap-2 p-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
                                ))}
                            </div>
                        ) : otherNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                                <Bell size={28} className="opacity-30" />
                                <span className="text-xs">Chưa có thông báo nào</span>
                            </div>
                        ) : (
                            <ul className="py-1">
                                {otherNotifications.map((notif) => (
                                    <li key={notif.id}>
                                        <button
                                            onClick={() => handleNotificationClick(notif)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-muted/60 transition-colors",
                                                !notif.read && "bg-brand/5",
                                            )}
                                        >
                                            {/* Icon */}
                                            <div className={cn(
                                                "shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center",
                                                !notif.read ? "bg-brand/10" : "bg-muted/60",
                                            )}>
                                                {getIcon(notif.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "text-[11px] font-medium mb-0.5",
                                                    !notif.read ? "text-brand" : "text-muted-foreground",
                                                )}>
                                                    {getLabel(notif.type)}
                                                </p>
                                                {notif.content && (
                                                    <p className="text-xs text-foreground line-clamp-2 leading-snug">
                                                        {notif.content}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                    {formatTime(notif.createdAt)}
                                                </p>
                                            </div>

                                            {/* Unread dot */}
                                            {!notif.read && (
                                                <div className="shrink-0 mt-2 w-2 h-2 rounded-full bg-brand" />
                                            )}

                                            {/* Read check */}
                                            {notif.read && (
                                                <Check size={12} className="shrink-0 mt-1 text-muted-foreground/40" />
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
