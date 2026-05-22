import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDetailPanel from "@/components/admin/AdminDetailPanel";
import AdminNotificationDetailContent from "@/components/admin/AdminNotificationDetailContent";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { Notification, NotificationType } from "@/types/notification";
import { Bell, CheckCircle, Loader2, Megaphone, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;
const notificationTypes: NotificationType[] = [
  "SYSTEM",
  "NEW_MESSAGE",
  "MENTION",
  "FRIEND_REQUEST",
  "GROUP_INVITE",
  "POST_LIKED",
  "POST_COMMENTED",
  "POST_SHARED",
  "STORY_REPLIED",
];
type ReadFilter = "ALL" | "READ" | "UNREAD";
type NotificationTypeFilter = NotificationType | "ALL";
const notificationTypeFilters: NotificationTypeFilter[] = ["ALL", ...notificationTypes];
const readFilters: ReadFilter[] = ["ALL", "UNREAD", "READ"];

function getNotificationLabel(notification: Notification) {
  return notification.content || notification.type.replaceAll("_", " ");
}

function resolveReadFilter(filter: ReadFilter) {
  if (filter === "READ") {
    return true;
  }
  if (filter === "UNREAD") {
    return false;
  }
  return undefined;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [type, setType] = useState<NotificationTypeFilter>("ALL");
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminService.listNotifications({
        type: type === "ALL" ? undefined : type,
        read: resolveReadFilter(readFilter),
        page,
        size: PAGE_SIZE,
      });
      if (response.code === 1000) {
        setNotifications(response.result.items);
        setTotalElements(response.result.totalElements);
        setTotalPages(response.result.totalPages);
      } else {
        toast.error(response.message || "Failed to load notifications");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load notifications";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, readFilter, type]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadOnPage = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );
  const systemOnPage = useMemo(
    () => notifications.filter((notification) => notification.type === "SYSTEM").length,
    [notifications]
  );

  const handleOpenDetail = async (notification: Notification) => {
    setSelectedNotification(notification);
    try {
      const response = await adminService.getNotification(notification.id);
      if (response.code === 1000) {
        setSelectedNotification(response.result);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load notification detail";
      toast.error(message);
    }
  };

  const handleTypeChange = (value: NotificationTypeFilter) => {
    setType(value);
    setPage(0);
  };

  const handleReadChange = (value: ReadFilter) => {
    setReadFilter(value);
    setPage(0);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <DashboardKpiCard label="Result Set" value={totalElements.toLocaleString()} helper="Admin-wide notifications" icon={Bell} colorClass="text-purple-600 bg-purple-50 border-purple-100" />
        <DashboardKpiCard label="Loaded Page" value={notifications.length.toLocaleString()} helper="Current page" icon={CheckCircle} colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" />
        <DashboardKpiCard label="Unread Page" value={unreadOnPage.toLocaleString()} helper="Needs attention" icon={ShieldAlert} colorClass="text-amber-600 bg-amber-50 border-amber-100" />
        <DashboardKpiCard label="System Page" value={systemOnPage.toLocaleString()} helper="Operational notices" icon={Megaphone} colorClass="text-blue-600 bg-blue-50 border-blue-100" />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-2">
        <select
          value={type}
          onChange={(event) =>
            handleTypeChange(
              notificationTypeFilters.find((item) => item === event.target.value) ?? "ALL"
            )
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600 outline-none"
        >
          <option value="ALL">All notification types</option>
          {notificationTypes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="flex gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-1">
          {readFilters.map((item) => (
            <button key={item} type="button" onClick={() => handleReadChange(item)} className={`flex-1 rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${readFilter === item ? "bg-[#7c3aed] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center"><Loader2 size={28} className="animate-spin text-[#7c3aed]" /></div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No notifications found</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((notification) => (
              <button key={notification.id} type="button" onClick={() => handleOpenDetail(notification)} className="flex w-full items-start justify-between gap-4 p-5 text-left hover:bg-slate-50/60">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">{notification.type}</span>
                    {!notification.read && <span className="rounded-lg border border-purple-100 bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-600">UNREAD</span>}
                  </div>
                  <p className="truncate text-sm font-semibold text-slate-700">{getNotificationLabel(notification)}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{notification.senderName || notification.senderId || "System"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Previous</button>
          <span className="text-xs font-medium text-slate-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Next</button>
        </div>
      )}

      {selectedNotification && (
        <AdminDetailPanel title="Notification Detail" subtitle={selectedNotification.id} onClose={() => setSelectedNotification(null)}>
          <AdminNotificationDetailContent notification={selectedNotification} />
        </AdminDetailPanel>
      )}
    </div>
  );
}
