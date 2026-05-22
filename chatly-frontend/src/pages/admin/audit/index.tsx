import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { AdminActivityLog, AdminStatsResponse } from "@/types/admin";
import { ClipboardList, Loader2, RefreshCw, ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";

type AuditFilter = "ALL" | "USER_SIGNUP" | "REPORT_CREATED";

const filters: Array<{ value: AuditFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "USER_SIGNUP", label: "Signups" },
  { value: "REPORT_CREATED", label: "Reports" },
];

export default function AuditLogsPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [filter, setFilter] = useState<AuditFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAuditData = useCallback(async (showToast = false) => {
    if (showToast) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await adminService.getStats();
      if (response.code === 1000) {
        setStats(response.result);
        if (showToast) {
          toast.success("Audit feed refreshed");
        }
      } else {
        toast.error(response.message || "Failed to load audit feed");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load audit feed";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const activities = useMemo(() => stats?.recentActivity ?? [], [stats]);
  const filteredActivities = useMemo(
    () =>
      filter === "ALL"
        ? activities
        : activities.filter((activity) => activity.type === filter),
    [activities, filter]
  );

  const signupCount = activities.filter((item) => item.type === "USER_SIGNUP").length;
  const reportCount = activities.filter((item) => item.type === "REPORT_CREATED").length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex justify-end">
        <button
          onClick={() => loadAuditData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <DashboardKpiCard
          label="Recent Events"
          value={activities.length.toLocaleString()}
          helper="From admin stats feed"
          icon={ClipboardList}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Signups"
          value={signupCount.toLocaleString()}
          helper="Recent user onboarding"
          icon={UserPlus}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <DashboardKpiCard
          label="Reports"
          value={reportCount.toLocaleString()}
          helper="Recent moderation events"
          icon={ShieldAlert}
          colorClass="text-red-600 bg-red-50 border-red-100"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex justify-end">
        <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
          {filters.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === item.value
                  ? "bg-[#7c3aed] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-72 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No audit events found
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredActivities.map((activity: AdminActivityLog) => (
              <div key={activity.id} className="p-5 flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    activity.type === "USER_SIGNUP"
                      ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                      : "text-red-600 bg-red-50 border-red-100"
                  }`}
                >
                  {activity.type === "USER_SIGNUP" ? (
                    <UserPlus size={17} />
                  ) : (
                    <ShieldAlert size={17} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      {activity.title}
                    </p>
                    <span className="text-xs text-slate-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{activity.description}</p>
                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    {activity.type} / {activity.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-amber-800">Audit API coverage</h3>
        <p className="text-xs text-amber-700 mt-1">
          The current feed is built from recent signup and report events. Dedicated admin
          audit-log endpoints are needed for exports, date ranges, and before/after
          payloads.
        </p>
      </div>
    </div>
  );
}
