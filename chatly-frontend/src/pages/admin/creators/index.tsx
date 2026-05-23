import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { UserResponse } from "@/types/auth";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import {
  Star,
  Loader2,
  Users,
  TrendingUp,
  UserCheck,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function CreatorsPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [recentUsers, setRecentUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.all([adminService.getStats(), adminService.listUsers({ page: 0, size: 10 })])
      .then(([statsRes, usersRes]) => {
        if (cancelled) return;
        if (statsRes.code === 1000) setStats(statsRes.result);
        else toast.error(statsRes.message || "Failed to load stats");

        if (usersRes.code === 1000) setRecentUsers(usersRes.result.items);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load creator data";
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  const maxGrowth = Math.max(...(stats?.userGrowth.map((p) => p.count) ?? [1]), 1);
  const weeklyIncrease =
    stats?.userGrowth && stats.userGrowth.length >= 2
      ? stats.userGrowth[stats.userGrowth.length - 1].count - stats.userGrowth[0].count
      : 0;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* KPI Cards — GET /api/admin/stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardKpiCard
          label="Total Users"
          value={stats?.totalUsers.toLocaleString() ?? "—"}
          helper="All registered accounts"
          icon={Users}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="New Today"
          value={stats?.todayNewUsers.toLocaleString() ?? "—"}
          helper="Signed up in the last 24 h"
          icon={TrendingUp}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
          trend={stats?.todayNewUsers ? `+${stats.todayNewUsers}` : undefined}
        />
        <DashboardKpiCard
          label="Active Users"
          value={stats?.activeUsers.toLocaleString() ?? "—"}
          helper="Active in last 24 h"
          icon={UserCheck}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <DashboardKpiCard
          label="Online Now"
          value={stats?.onlineUsers.toLocaleString() ?? "—"}
          helper="Currently connected"
          icon={Star}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Growth Chart — GET /api/admin/stats → userGrowth[] */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-slate-700">Cumulative User Growth</p>
              <p className="text-xs text-slate-400 mt-0.5">Total registered users — last 7 days</p>
            </div>
            {weeklyIncrease > 0 && (
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                +{weeklyIncrease} this week
              </span>
            )}
          </div>
          {stats?.userGrowth && stats.userGrowth.length > 0 ? (
            <div className="flex items-end gap-2" style={{ height: "140px" }}>
              {stats.userGrowth.map((point) => {
                const heightPct = Math.max(Math.round((point.count / maxGrowth) * 100), 2);
                return (
                  <div key={point.date} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                    <span className="text-[9px] text-slate-400 font-semibold">{point.count}</span>
                    <div
                      className="w-full rounded-t-lg bg-linear-to-t from-amber-500 to-amber-300"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-slate-300 truncate w-full text-center leading-tight">
                      {point.date}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-36 items-center justify-center text-slate-400 text-xs">
              No growth data available
            </div>
          )}
        </div>

        {/* Recent Registrations — GET /api/admin/users?page=0&size=10 */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">Recent Registrations</p>
            <a
              href="/admin/users"
              className="text-[11px] text-[#7c3aed] font-semibold flex items-center gap-1 hover:underline"
            >
              View all <ExternalLink size={10} />
            </a>
          </div>
          {recentUsers.length > 0 ? (
            <ul className="divide-y divide-slate-50">
              {recentUsers.map((user) => (
                <li key={user.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-purple-50 border border-purple-100 flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-bold text-purple-500">
                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 truncate">{user.displayName || user.username}</p>
                    <p className="text-[10px] text-slate-400 truncate">@{user.username}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {user.suspended ? (
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-lg px-2 py-0.5">
                        Suspended
                      </span>
                    ) : (
                      <p className="text-[10px] text-slate-300 flex items-center gap-1">
                        <Calendar size={9} />
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-36 items-center justify-center text-slate-400 text-xs">
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
