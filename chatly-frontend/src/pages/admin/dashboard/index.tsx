import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import { CustomChart } from "@/components/admin/CustomChart";
import { DashboardActivityTimeline } from "@/components/admin/DashboardActivityTimeline";
import { DashboardBreakdownCard } from "@/components/admin/DashboardBreakdownCard";
import { DashboardHealthPanel } from "@/components/admin/DashboardHealthPanel";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import {
  buildDashboardViewModel,
  formatDecimal,
  formatNumber,
} from "./dashboardData";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminService.getStats();
        if (response.code === 1000) {
          setStats(response.result);
        } else {
          toast.error(response.message || "Failed to load system metrics");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unable to reach server";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
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
