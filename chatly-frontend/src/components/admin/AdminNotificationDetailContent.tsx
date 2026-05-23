import { Bell, UserRound } from "lucide-react";
import type { Notification } from "@/types/notification";

interface AdminNotificationDetailContentProps {
  notification: Notification;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function DetailRow({ label, value }: { label: string; value?: string | boolean | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value === true ? "Yes" : value === false ? "No" : value || "Not available"}
      </p>
    </div>
  );
}

export default function AdminNotificationDetailContent({
  notification,
}: AdminNotificationDetailContentProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-purple-600">
          <Bell size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{notification.type}</p>
          <p className="text-xs text-slate-400">{formatDate(notification.createdAt)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-sm font-medium leading-6 text-slate-700">
          {notification.content || "No notification content"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="Read" value={notification.read} />
        <DetailRow label="Reference" value={notification.referenceId} />
        <DetailRow label="Sender ID" value={notification.senderId} />
        <DetailRow label="Receiver ID" value={notification.receiverId} />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
          <UserRound size={13} />
          Sender
        </p>
        <p className="text-sm font-bold text-slate-800">
          {notification.senderName || notification.senderId || "System"}
        </p>
      </div>
    </div>
  );
}
