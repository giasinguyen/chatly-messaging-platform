import { useCallback, useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { Star, Loader2, Users, FileText } from "lucide-react";
import { toast } from "sonner";

const CREATOR_TODO_NOTE =
  "Backend creator analytics API not yet available. Implement when GET /api/admin/analytics/creators is ready.";

export default function CreatorsPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getStats();
      if (res.code === 1000) {
        setStats(res.result);
      } else {
        toast.error(res.message || "Failed to load platform stats");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load stats";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <DashboardKpiCard
          label="Total Users"
          value={stats?.totalUsers.toLocaleString() ?? "—"}
          helper="Registered accounts"
          icon={Users}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Total Posts"
          value={stats?.totalPosts.toLocaleString() ?? "—"}
          helper="Published content"
          icon={FileText}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
        <DashboardKpiCard
          label="Today's New Users"
          value={stats?.todayNewUsers.toLocaleString() ?? "—"}
          helper="New creator sign-ups in 24 h"
          icon={Star}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
        />
      </div>

      {/* Top creators leaderboard — awaiting backend API */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
        <Star size={28} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-500 mb-1">Creator Leaderboard</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Top creators ranked by post volume, follower growth, and engagement rate are not yet
          available. A dedicated API endpoint is required to deliver this data efficiently.
        </p>
        <code className="mt-3 block text-[11px] text-slate-400 bg-slate-100 rounded-lg px-3 py-2 max-w-lg mx-auto">
          {CREATOR_TODO_NOTE}
        </code>
      </div>

      {/* User growth trend — real data from getStats() */}
      {stats?.userGrowth && stats.userGrowth.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">User Growth (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.userGrowth.map((point) => {
              const maxCount = Math.max(...stats.userGrowth.map((p) => p.count), 1);
              const heightPct = Math.round((point.count / maxCount) * 100);
              return (
                <div key={point.date} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[10px] text-slate-400">{point.count}</span>
                  <div
                    className="w-full rounded-t-lg bg-amber-400/70"
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
      )}
    </div>
  );
}
