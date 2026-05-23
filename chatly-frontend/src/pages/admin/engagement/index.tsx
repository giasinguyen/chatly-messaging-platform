import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { BarChart2, Loader2, MessageSquare, ThumbsUp, Users, FileText } from "lucide-react";
import { toast } from "sonner";

const ANALYTICS_TODO_NOTE =
  "Backend analytics API not yet available. Implement when GET /api/admin/analytics/engagement is ready.";

export default function EngagementPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    adminService
      .getStats()
      .then((res) => {
        if (cancelled) return;
        if (res.code === 1000) {
          setStats(res.result);
        } else {
          toast.error(res.message || "Failed to load platform stats");
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load stats";
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* KPI cards sourced from /api/admin/stats */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <DashboardKpiCard
          label="Total Posts"
          value={stats?.totalPosts.toLocaleString() ?? "—"}
          helper="All platform posts"
          icon={FileText}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Active Users"
          value={stats?.activeUsers.toLocaleString() ?? "—"}
          helper="Recently active accounts"
          icon={Users}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
        <DashboardKpiCard
          label="Total Messages"
          value={stats?.totalMessages.toLocaleString() ?? "—"}
          helper="Across all conversations"
          icon={MessageSquare}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <DashboardKpiCard
          label="New Users Today"
          value={stats?.todayNewUsers.toLocaleString() ?? "—"}
          helper="Registrations in 24 h"
          icon={BarChart2}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
        />
      </div>

      {/* Message activity — real data from getStats() if available */}
      {stats?.messageActivity && stats.messageActivity.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Message Activity (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.messageActivity.map((point) => {
              const maxCount = Math.max(...stats.messageActivity.map((p) => p.count), 1);
              const heightPct = Math.round((point.count / maxCount) * 100);
              return (
                <div key={point.date} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[10px] text-slate-400">{point.count}</span>
                  <div
                    className="w-full rounded-t-lg bg-[#7c3aed]/70"
                    style={{ height: `${heightPct}%`, minHeight: "4px" }}
                  />
                  <span className="text-[9px] text-slate-300 truncate w-full text-center">
                    {point.date?.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Deep engagement analytics — awaiting backend API */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
        <ThumbsUp size={28} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-500 mb-1">Deep Engagement Analytics</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Per-post reaction counts, share rates, comment ratios, and feed reach are not yet
          available. These metrics require dedicated endpoints on the backend.
        </p>
        <code className="mt-3 block text-[11px] text-slate-400 bg-slate-100 rounded-lg px-3 py-2 max-w-lg mx-auto">
          {ANALYTICS_TODO_NOTE}
        </code>
      </div>
    </div>
  );
}
