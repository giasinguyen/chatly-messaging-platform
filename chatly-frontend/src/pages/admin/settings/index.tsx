import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import { CheckCircle, Loader2, Lock, RefreshCw, Settings, Shield } from "lucide-react";
import { toast } from "sonner";

const policyToggles = [
  { label: "Public registration", enabled: true },
  { label: "User reports", enabled: true },
  { label: "AI proactive replies", enabled: false },
  { label: "Global maintenance banner", enabled: false },
];

const policyLimits = [
  { label: "Session timeout", value: "7 days" },
  { label: "Max upload size", value: "25 MB" },
  { label: "Message retention", value: "Unlimited" },
  { label: "Rate limit window", value: "60 seconds" },
];

export default function SettingsPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSettingsContext = useCallback(async (showToast = false) => {
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
          toast.success("Settings context refreshed");
        }
      } else {
        toast.error(response.message || "Failed to load settings context");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load settings context";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsContext();
  }, [loadSettingsContext]);

  const healthScore = useMemo(() => {
    const healthItems = stats?.systemHealth ?? [];
    if (healthItems.length === 0) {
      return 0;
    }

    const upCount = healthItems.filter((item) => item.status === "UP").length;
    return Math.round((upCount / healthItems.length) * 100);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex justify-end">
        <button
          onClick={() => loadSettingsContext(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <DashboardKpiCard
          label="Health Score"
          value={`${healthScore}%`}
          helper="From system checks"
          icon={CheckCircle}
          colorClass={
            healthScore === 100
              ? "text-emerald-600 bg-emerald-50 border-emerald-100"
              : "text-amber-600 bg-amber-50 border-amber-100"
          }
        />
        <DashboardKpiCard
          label="Pending Reports"
          value={(stats?.pendingReports ?? 0).toLocaleString()}
          helper="Moderation load"
          icon={Shield}
          colorClass="text-red-600 bg-red-50 border-red-100"
        />
        <DashboardKpiCard
          label="Managed Policies"
          value={policyToggles.length.toLocaleString()}
          helper="Awaiting settings API"
          icon={Settings}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Policy Toggles</h3>
          <div className="mt-4 space-y-3">
            {policyToggles.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 border border-slate-100 rounded-xl px-4 py-3"
              >
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                <button
                  disabled
                  className={`w-12 h-6 rounded-full border p-0.5 transition-all ${
                    item.enabled
                      ? "bg-purple-100 border-purple-200"
                      : "bg-slate-100 border-slate-200"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-sm ${
                      item.enabled ? "ml-5" : "ml-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Operational Limits</h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {policyLimits.map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-slate-700 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border text-amber-600 bg-amber-50 border-amber-100 shrink-0">
            <Lock size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Settings API coverage</h3>
            <p className="text-xs text-slate-500 mt-1">
              Controls are rendered as read-only until GET /api/admin/settings and
              PUT /api/admin/settings are available on the backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
