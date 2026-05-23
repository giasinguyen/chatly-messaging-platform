import { useEffect, useMemo, useRef, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import { CustomChart } from "@/components/admin/CustomChart";
import { DashboardActivityTimeline } from "@/components/admin/DashboardActivityTimeline";
import { DashboardBreakdownCard } from "@/components/admin/DashboardBreakdownCard";
import { DashboardHealthPanel } from "@/components/admin/DashboardHealthPanel";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import DashboardOperationsPanel from "@/components/admin/DashboardOperationsPanel";
import {
  buildDashboardViewModel,
  formatDecimal,
  formatNumber,
} from "./dashboardData";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const REFRESH_INTERVAL_MS = 30_000;

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await adminService.getStats();
      if (response.code === 1000) {
        setStats(response.result);
        setLastUpdated(new Date());
      } else {
        toast.error(response.message || "Failed to load system metrics");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to reach server";
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(() => fetchStats(true), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  const dashboardData = useMemo(() => {
    return stats ? buildDashboardViewModel(stats) : null;
  }, [stats]);

  if (isLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-[#7c3aed]" />
        <span className="text-sm font-semibold text-slate-500">
          Retrieving system diagnostics...
        </span>
      </div>
    );
  }

  if (!stats || !dashboardData) {
    return (
      <div className="p-8 text-center text-slate-400">
        Failed to load statistics. Please try reloading.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleTimeString()} · auto-refreshes every 30s`
            : ""}
        </span>
        <button
          type="button"
          onClick={() => fetchStats()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-all"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-5">
        {dashboardData.kpiCards.map((card) => (
          <DashboardKpiCard key={card.label} {...card} />
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {dashboardData.operationalStats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 px-2">
                <Icon size={17} className={item.colorClass} />
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
                    {item.label}
                  </span>
                  <p
                    className={`text-lg font-bold ${item.colorClass} font-outfit leading-tight`}
                  >
                    {formatNumber(item.value)}
                    {item.suffix}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DashboardOperationsPanel stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <CustomChart
            data={stats.userGrowth}
            title="User Growth"
            subtitle="Cumulative registrations over the last 7 days"
            accent="violet"
          />
        </div>
        <DashboardBreakdownCard
          title="User Availability"
          subtitle="Online and recent activity distribution"
          items={dashboardData.userBreakdown}
          footer={`${formatNumber(stats.activeUsers)} users were active in the last 24 hours`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <CustomChart
          data={stats.messageActivity}
          title="Message Activity"
          subtitle="Messages sent per day over the last 7 days"
          variant="bar"
          accent="blue"
        />
        <DashboardBreakdownCard
          title="Conversation Mix"
          subtitle="Direct chats compared with group chats"
          items={dashboardData.conversationBreakdown}
          footer={`${formatDecimal(
            dashboardData.averageMessagesPerConversation
          )} messages per conversation on average`}
        />
        <DashboardBreakdownCard
          title="Content Volume"
          subtitle="Scaled to the largest tracked content type"
          items={dashboardData.contentBreakdown}
          footer={`${formatNumber(stats.totalPosts)} posts and ${formatNumber(
            stats.totalMessages
          )} messages tracked`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <DashboardHealthPanel items={stats.systemHealth} />
        <div className="xl:col-span-2">
          <DashboardActivityTimeline items={stats.recentActivity} />
        </div>
      </div>
    </div>
  );
}
