import React, { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import { CustomChart } from "@/components/admin/CustomChart";
import {
  Users,
  Activity,
  MessageSquare,
  Database,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Globe,
  UserPlus,
  MessagesSquare,
  FileText,
  TrendingUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export const DashboardPage: React.FC = () => {
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

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-400">
        Failed to load statistics. Please try reloading.
      </div>
    );
  }

  const primaryKPIs = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      label: "Online Now",
      value: stats.onlineUsers,
      icon: Globe,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Total Messages",
      value: stats.totalMessages,
      icon: MessageSquare,
      color: "text-violet-600 bg-violet-50 border-violet-100",
    },
    {
      label: "Total Posts",
      value: stats.totalPosts,
      icon: FileText,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
  ];

  const secondaryKPIs = [
    { label: "Active (24h)", value: stats.activeUsers, icon: Activity, color: "text-teal-600" },
    { label: "New Today", value: stats.todayNewUsers, icon: UserPlus, color: "text-indigo-600" },
    { label: "Conversations", value: stats.totalConversations, icon: MessagesSquare, color: "text-cyan-600" },
    { label: "Groups", value: stats.totalGroups, icon: Database, color: "text-amber-600" },
    {
      label: "Pending Reports",
      value: stats.pendingReports,
      icon: ShieldAlert,
      color: stats.pendingReports > 0 ? "text-red-600" : "text-slate-400",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-outfit">
          Dashboard Overview
        </h1>
        <p className="text-sm text-slate-500">Real-time usage metrics and system status</p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {primaryKPIs.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {card.label}
                </p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1.5 font-outfit">
                  {card.value.toLocaleString()}
                </h3>
              </div>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.color}`}
              >
                <Icon size={20} className="stroke-[2.2]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary KPI Strip */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {secondaryKPIs.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2.5 px-3">
                <Icon size={16} className={item.color} />
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
                    {item.label}
                  </span>
                  <p className={`text-lg font-bold ${item.color} font-outfit leading-tight`}>
                    {item.value.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CustomChart
          data={stats.userGrowth}
          title="User Growth"
          subtitle="Cumulative registrations (7 days)"
        />
        <CustomChart
          data={stats.messageActivity}
          title="Message Activity"
          subtitle="Daily messages sent (7 days)"
        />
      </div>

      {/* System Health + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* System Health */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-lg font-outfit mb-1">System Health</h3>
            <p className="text-xs text-slate-500 mb-5">Infrastructure component status</p>

            <div className="space-y-3">
              {stats.systemHealth.map((sh, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-slate-700">{sh.service}</span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {sh.description}
                    </span>
                  </div>
                  {sh.status === "UP" ? (
                    <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-emerald-100 shrink-0 ml-3">
                      UP
                    </span>
                  ) : (
                    <span className="text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-red-100 shrink-0 ml-3 animate-pulse">
                      DOWN
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className={`mt-5 pt-3 border-t border-slate-50 flex items-center gap-2 text-xs font-semibold ${
              stats.systemHealth.some((sh) => sh.status === "DOWN")
                ? "text-red-600"
                : "text-emerald-600"
            }`}
          >
            {stats.systemHealth.some((sh) => sh.status === "DOWN") ? (
              <>
                <AlertTriangle size={15} className="animate-pulse" />
                <span>System issues detected</span>
              </>
            ) : (
              <>
                <CheckCircle size={15} />
                <span>All systems operational</span>
              </>
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg font-outfit mb-1">Activity Timeline</h3>
          <p className="text-xs text-slate-500 mb-5">Recent system events</p>

          <div className="relative border-l-2 border-slate-100 ml-3 pl-5 space-y-5">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="relative">
                <span
                  className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                    activity.type === "USER_SIGNUP" ? "bg-purple-500" : "bg-red-500"
                  }`}
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {activity.type === "USER_SIGNUP" ? (
                        <TrendingUp size={12} className="text-purple-400" />
                      ) : (
                        <ShieldAlert size={12} className="text-red-400" />
                      )}
                      <h4 className="text-sm font-bold text-slate-800">{activity.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{activity.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}

            {stats.recentActivity.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                No recent events logged
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
