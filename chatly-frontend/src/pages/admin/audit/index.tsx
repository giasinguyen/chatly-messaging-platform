import { useCallback, useEffect, useMemo, useState } from "react";
import AdminAuditDetailContent from "@/components/admin/AdminAuditDetailContent";
import AdminDetailPanel from "@/components/admin/AdminDetailPanel";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { AdminAuditLogResponse } from "@/types/admin";
import { AlertCircle, ClipboardList, Loader2, RefreshCw, Settings, ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;
const filters = [
  { value: "ALL", label: "All" },
  { value: "USER_CREATED", label: "Users" },
  { value: "USER_SUSPENDED", label: "Suspended" },
  { value: "POST_DELETED", label: "Posts" },
  { value: "MESSAGE_DELETED", label: "Messages" },
  { value: "SETTINGS_UPDATED", label: "Settings" },
];

function isDestructive(type: string) {
  return type.includes("DELETED") || type.includes("SUSPENDED");
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogResponse[]>([]);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogResponse | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAuditData = useCallback(async (showToast = false) => {
    if (showToast) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      const response = await adminService.listAuditLogs({
        type: filter === "ALL" ? undefined : filter,
        page,
        size: PAGE_SIZE,
      });
      if (response.code === 1000) {
        setAuditLogs(response.result.items);
        setTotalElements(response.result.totalElements);
        setTotalPages(response.result.totalPages);
        if (showToast) {
          toast.success("Audit feed refreshed");
        }
      } else {
        const msg = response.message || "Failed to load audit feed";
        setLoadError(msg);
        toast.error(msg);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load audit feed";
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const destructiveOnPage = useMemo(
    () => auditLogs.filter((item) => isDestructive(item.type)).length,
    [auditLogs]
  );
  const settingsOnPage = useMemo(
    () => auditLogs.filter((item) => item.type === "SETTINGS_UPDATED").length,
    [auditLogs]
  );
  const userOnPage = useMemo(
    () => auditLogs.filter((item) => item.targetType === "USER").length,
    [auditLogs]
  );

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setPage(0);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex justify-end">
        <button onClick={() => loadAuditData(true)} disabled={isRefreshing} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50">
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <DashboardKpiCard label="Audit Events" value={totalElements.toLocaleString()} helper="Persisted admin logs" icon={ClipboardList} colorClass="text-purple-600 bg-purple-50 border-purple-100" />
        <DashboardKpiCard label="User Actions" value={userOnPage.toLocaleString()} helper="Current page" icon={UserPlus} colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" />
        <DashboardKpiCard label="Destructive Page" value={destructiveOnPage.toLocaleString()} helper="Deletes and suspensions" icon={ShieldAlert} colorClass="text-red-600 bg-red-50 border-red-100" />
        <DashboardKpiCard label="Settings Page" value={settingsOnPage.toLocaleString()} helper="Policy changes" icon={Settings} colorClass="text-blue-600 bg-blue-50 border-blue-100" />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-1">
          {filters.map((item) => (
            <button key={item.value} type="button" onClick={() => handleFilterChange(item.value)} className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${filter === item.value ? "bg-[#7c3aed] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center"><Loader2 size={28} className="animate-spin text-[#7c3aed]" /></div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-500">
              <AlertCircle size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Failed to load audit logs</p>
            <p className="max-w-xs text-xs text-slate-400">{loadError}</p>
            <button type="button" onClick={() => loadAuditData()} className="mt-1 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Try again
            </button>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400">
              <ClipboardList size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-600">No audit events found</p>
            <p className="max-w-xs text-xs text-slate-400">
              Audit logs are recorded when admins perform actions (create users, delete posts, update settings, etc.). No events match the current filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {auditLogs.map((activity) => (
              <button key={activity.id} type="button" onClick={() => setSelectedLog(activity)} className="flex w-full items-start gap-4 p-5 text-left hover:bg-slate-50/60">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isDestructive(activity.type) ? "border-red-100 bg-red-50 text-red-600" : "border-purple-100 bg-purple-50 text-purple-600"}`}>
                  {isDestructive(activity.type) ? <ShieldAlert size={17} /> : <ClipboardList size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <p className="text-sm font-bold text-slate-800">{activity.title}</p>
                    <span className="text-xs text-slate-400">{new Date(activity.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{activity.description}</p>
                  <p className="mt-2 font-mono text-[11px] text-slate-400">{activity.type} / {activity.targetType} / {activity.targetId}</p>
                </div>
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

      {selectedLog && (
        <AdminDetailPanel title={selectedLog.title} subtitle={selectedLog.id} onClose={() => setSelectedLog(null)}>
          <AdminAuditDetailContent auditLog={selectedLog} />
        </AdminDetailPanel>
      )}
    </div>
  );
}
