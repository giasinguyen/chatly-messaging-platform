import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    Check,
    CheckCheck,
    MessageCircle,
    UserPlus,
    Users,
    X,
    Heart,
    Reply,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/notification.service";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { useConversationPrefsStore } from "@/store/conversationPrefs.store";
import { useContactStore } from "@/store/contact.store";
import type { Notification, NotificationEvent } from "@/types/notification";
import { resolveNotificationRoute } from "@/utils/notificationRedirect";
import { formatSystemMessage } from "@/utils/systemMessage";
import { playNotificationSound } from "@/store/notificationPrefs.store";

interface NotificationBellProps {
    collapsed?: boolean;
}

export function NotificationBell({ collapsed = false }: NotificationBellProps) {
    const { t } = useTranslation();
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
                const notifRes = await notificationService.getNotifications(
                    0,
                    20,
                );
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
        return () => {
            cancelled = true;
        };
    }, [user, setNotifications, setLoading]);

    // ----- Real-time WebSocket events -----
    const handleNotificationEvent = useCallback(
        (event: NotificationEvent) => {
            addNotification(event.notification);
            if (event.notification.type === "NEW_MESSAGE") {
                const convId = event.notification.referenceId ?? "";
                const isMuted = convPrefs[convId]?.isMuted ?? false;
                if (!isMuted) {
                    playNotificationSound();
                }
            }
            if (event.notification.type === "FRIEND_REQUEST") {
                useContactStore.getState().triggerPendingRefresh();
            }
        },
        [addNotification, convPrefs],
    );

    useNotificationSocket({ onEvent: handleNotificationEvent });

    // ----- Split counts by type -----
    const unreadOtherCount = useMemo(
        () =>
            notifications.filter((n) => n.type !== "NEW_MESSAGE" && !n.read)
                .length,
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
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // ----- Mark single notification as read -----
    const handleMarkRead = useCallback(
        async (notif: Notification) => {
            if (notif.read) return;
            try {
                await notificationService.markAsRead(notif.id);
                markOneRead(notif.id);
            } catch {
                // silently fail
            }
        },
        [markOneRead],
    );

    // ----- Mark all as read -----
    const handleMarkAllRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            markAllRead();
        } catch {
            // silently fail
        }
    }, [markAllRead]);

    const handleNotificationClick = useCallback(
        async (notif: Notification) => {
            await handleMarkRead(notif);
            setOpen(false);
            navigate(resolveNotificationRoute(notif));
        },
        [handleMarkRead, navigate],
    );

    const getIcon = (type: Notification["type"]) => {
        switch (type) {
            case "NEW_MESSAGE":
                return <MessageCircle size={14} className="text-brand" />;
            case "FRIEND_REQUEST":
                return <UserPlus size={14} className="text-green-500" />;
            case "GROUP_INVITE":
            case "GROUP_UPDATED":
            case "GROUP_JOIN_REQUEST":
            case "MEMBER_JOINED":
            case "GROUP_LEAVE":
                return <Users size={14} className="text-purple-500" />;
            case "POST_LIKED":
                return <Heart size={14} className="text-red-500" />;
            case "POST_COMMENTED":
                return <MessageCircle size={14} className="text-blue-500" />;
            case "COMMENT_REPLIED":
                return <Reply size={14} className="text-purple-500" />;
            default:
                return <Bell size={14} className="text-muted-foreground" />;
        }
    };

    const getLabel = (type: Notification["type"]) => {
        switch (type) {
            case "NEW_MESSAGE":
                return t("notifications.type_new_message");
            case "FRIEND_REQUEST":
                return t("notifications.type_friend_request");
            case "GROUP_INVITE":
                return t("notifications.type_group_invite");
            case "GROUP_UPDATED":
                return t("notifications.group_updated");
            case "GROUP_JOIN_REQUEST":
                return t("notifications.new_join_request");
            case "MEMBER_JOINED":
                return t("notifications.new_member_joined");
            case "GROUP_LEAVE":
                return t("notifications.group_left");
            case "POST_LIKED":
                return t("notifications.type_post_liked");
            case "POST_COMMENTED":
                return t("notifications.type_post_commented");
            case "COMMENT_REPLIED":
                return t("notifications.type_comment_replied");
            default:
                return t("notifications.title");
        }
    };

    const formatTime = (createdAt: string) => {
        const diff = Date.now() - new Date(createdAt).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return t("notifications.time_just_now");
        if (minutes < 60)
            return t("notifications.time_m_ago", { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t("notifications.time_h_ago", { count: hours });
        const days = Math.floor(hours / 24);
        return t("notifications.time_d_ago", { count: days });
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen((v) => !v)}
                title={t("notifications.title")}
                className={cn(
                    "relative flex items-center rounded-xl transition-all duration-200 text-sm font-medium w-full text-left cursor-pointer",
                    collapsed ? "justify-center p-2.5" : "gap-3 p-2.5",
                    open
                        ? "text-[#1a146b] dark:text-white font-bold bg-[#e2dfff]/30 dark:bg-[#312e81]/20"
                        : "text-slate-500 dark:text-slate-400 hover:text-[#1a146b] dark:hover:text-white hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20",
                )}
            >
                {open && <div className="iv-nav-active-marker" />}
                <div className="relative flex items-center justify-center">
                    <Bell className="h-5 w-5 transition-colors" />
                </div>
                {!collapsed && (
                    <span className="font-inter text-sm flex-grow">
                        {t("notifications.title")}
                    </span>
                )}
                {unreadOtherCount > 0 &&
                    (collapsed ? (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[#a43073] text-white text-[8px] font-bold px-0.5 leading-none">
                            {unreadOtherCount > 9 ? "9+" : unreadOtherCount}
                        </span>
                    ) : (
                        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#a43073] text-white text-[10px] font-bold px-1 leading-none">
                            {unreadOtherCount > 99 ? "99+" : unreadOtherCount}
                        </span>
                    ))}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute left-full top-0 ml-2 w-80 bg-background border border-border rounded-xl shadow-2xl z-50 flex flex-col max-h-120 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                        <span className="font-semibold text-sm text-foreground">
                            {t("notifications.title")}
                            {unreadOtherCount > 0 && (
                                <span className="ml-2 text-[11px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">
                                    {t("notifications.unread_badge", {
                                        count: unreadOtherCount,
                                    })}
                                </span>
                            )}
                        </span>
                        <div className="flex items-center gap-1">
                            {unreadOtherCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    title={t("notifications.mark_all_read")}
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
                                    <div
                                        key={i}
                                        className="h-12 rounded-lg bg-muted/50 animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : otherNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                                <Bell size={28} className="opacity-30" />
                                <span className="text-xs">
                                    {t("notifications.empty_short")}
                                </span>
                            </div>
                        ) : (
                            <ul className="py-1">
                                {otherNotifications.map((notif) => (
                                    <li key={notif.id}>
                                        <button
                                            onClick={() =>
                                                handleNotificationClick(notif)
                                            }
                                            className={cn(
                                                "w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-muted/60 transition-colors",
                                                !notif.read && "bg-brand/5",
                                            )}
                                        >
                                            {/* Icon */}
                                            <div
                                                className={cn(
                                                    "shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center",
                                                    !notif.read
                                                        ? "bg-brand/10"
                                                        : "bg-muted/60",
                                                )}
                                            >
                                                {getIcon(notif.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={cn(
                                                        "text-[11px] font-medium mb-0.5",
                                                        !notif.read
                                                            ? "text-brand"
                                                            : "text-muted-foreground",
                                                    )}
                                                >
                                                    {getLabel(notif.type)}
                                                </p>
                                                {notif.content && (
                                                    <p className="text-xs text-foreground line-clamp-2 leading-snug">
                                                        {formatSystemMessage(
                                                            notif.content,
                                                            t,
                                                        )}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                    {formatTime(
                                                        notif.createdAt,
                                                    )}
                                                </p>
                                            </div>

                                            {/* Unread dot */}
                                            {!notif.read && (
                                                <div className="shrink-0 mt-2 w-2 h-2 rounded-full bg-brand" />
                                            )}

                                            {/* Read check */}
                                            {notif.read && (
                                                <Check
                                                    size={12}
                                                    className="shrink-0 mt-1 text-muted-foreground/40"
                                                />
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
