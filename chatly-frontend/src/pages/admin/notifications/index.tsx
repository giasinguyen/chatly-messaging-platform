import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { notificationService } from "@/services/notification.service";
import type { Notification, NotificationScope } from "@/types/notification";
import { Bell, CheckCircle, Loader2, Megaphone, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;
const scopes: NotificationScope[] = ["ALL", "CHAT", "SOCIAL"];

function getNotificationLabel(notification: Notification) {
  return notification.content || notification.type.replaceAll("_", " ");
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scope, setScope] = useState<NotificationScope>("ALL");
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listResponse, countResponse] = await Promise.all([
        notificationService.getNotifications(page, PAGE_SIZE, scope),
        notificationService.getUnreadCount(scope),
      ]);

      if (listResponse.code === 1000) {
        setNotifications(listResponse.result);
      }
      if (countResponse.code === 1000) {
        setUnreadCount(countResponse.result);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load notifications";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, scope]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadOnPage = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const systemCount = useMemo(
    () => notifications.filter((notification) => notification.type === "SYSTEM").length,
    [notifications]
  );

  const handleScopeChange = (nextScope: NotificationScope) => {
    setScope(nextScope);
    setPage(0);
  };

  const handleMarkAllRead = async () => {
    setIsUpdating(true);
    try {
      const response = await notificationService.markAllAsRead(scope);
      if (response.code === 1000) {
        toast.success("Notifications marked as read");
        await loadNotifications();
      } else {
        toast.error(response.message || "Failed to mark notifications as read");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to mark notifications as read";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <DashboardKpiCard
          label="Unread"
          value={unreadCount.toLocaleString()}
          helper={`${scope.toLowerCase()} scope`}
          icon={Bell}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Loaded"
          value={notifications.length.toLocaleString()}
          helper="Current page"
          icon={CheckCircle}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <DashboardKpiCard
          label="Unread Page"
          value={unreadOnPage.toLocaleString()}
          helper="Needs attention"
          icon={ShieldAlert}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
        />
        <DashboardKpiCard
          label="System"
          value={systemCount.toLocaleString()}
          helper="Current page"
          icon={Megaphone}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          {scopes.map((item) => (
            <button
              key={item}
              onClick={() => handleScopeChange(item)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                scope === item
                  ? "bg-[#7c3aed] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={isUpdating || unreadCount === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle size={14} />
          Mark all read
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No notifications found
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                        {notification.type}
                      </span>
                      {!notification.read && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg">
                          UNREAD
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {getNotificationLabel(notification)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {notification.senderName || notification.senderId || "System"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm h-fit">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border text-purple-600 bg-purple-50 border-purple-100 mb-4">
            <Send size={18} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Broadcast Console</h3>
          <p className="text-xs text-slate-500 mt-1">
            Targeted and global dispatch controls are waiting for admin notification
            endpoints.
          </p>
          <div className="mt-4 space-y-2">
            {[
              "POST /api/admin/notifications/broadcast",
              "POST /api/admin/notifications/targeted",
              "GET /api/admin/notifications/history",
            ].map((endpoint) => (
              <div
                key={endpoint}
                className="text-xs font-mono text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
              >
                {endpoint}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-xs text-slate-500 font-medium">Page {page + 1}</span>
        <button
          onClick={() => setPage((current) => current + 1)}
          disabled={notifications.length < PAGE_SIZE}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
