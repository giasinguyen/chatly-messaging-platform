import { ClipboardList } from "lucide-react";
import type { AdminAuditLogResponse } from "@/types/admin";

interface AdminAuditDetailContentProps {
  auditLog: AdminAuditLogResponse;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-700">
        {value || "Not available"}
      </p>
    </div>
  );
}

export default function AdminAuditDetailContent({ auditLog }: AdminAuditDetailContentProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-purple-600">
          <ClipboardList size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{auditLog.title}</p>
          <p className="text-xs text-slate-400">{formatDate(auditLog.createdAt)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-sm font-medium leading-6 text-slate-700">
          {auditLog.description || "No description"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="Type" value={auditLog.type} />
        <DetailRow label="Target Type" value={auditLog.targetType} />
        <DetailRow label="Target ID" value={auditLog.targetId} />
        <DetailRow label="Admin User ID" value={auditLog.adminUserId} />
      </div>
    </div>
  );
}
