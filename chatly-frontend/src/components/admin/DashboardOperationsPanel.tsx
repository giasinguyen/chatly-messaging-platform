import { Activity, MessageSquare, ShieldAlert, Users } from "lucide-react";
import type { AdminStatsResponse } from "@/types/admin";

interface DashboardOperationsPanelProps {
  stats: AdminStatsResponse;
}

interface OperationLane {
  label: string;
  value: string;
  helper: string;
  percent: number;
  colorClass: string;
}

function getPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((value / total) * 100));
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

export default function DashboardOperationsPanel({
  stats,
}: DashboardOperationsPanelProps) {
  const healthUpCount = stats.systemHealth.filter((item) => item.status === "UP").length;
  const directConversations = Math.max(stats.totalConversations - stats.totalGroups, 0);
  const lanes: OperationLane[] = [
    {
      label: "User Availability",
      value: `${formatNumber(stats.onlineUsers)} online`,
      helper: `${formatNumber(stats.activeUsers)} active in the last 24 hours`,
      percent: getPercent(stats.onlineUsers, stats.totalUsers),
      colorClass: "bg-emerald-500",
    },
    {
      label: "Conversation Load",
      value: `${formatNumber(stats.totalGroups)} groups`,
      helper: `${formatNumber(directConversations)} direct conversations`,
      percent: getPercent(stats.totalGroups, stats.totalConversations),
      colorClass: "bg-cyan-500",
    },
    {
      label: "Message Density",
      value: `${formatNumber(stats.totalMessages)} messages`,
      helper: `${formatNumber(stats.totalPosts)} social posts tracked`,
      percent: getPercent(stats.totalMessages, Math.max(stats.totalMessages, stats.totalPosts, 1)),
      colorClass: "bg-blue-500",
    },
    {
      label: "Moderation Pressure",
      value: `${formatNumber(stats.pendingReports)} pending`,
      helper: stats.pendingReports > 0 ? "Queue requires review" : "Report queue is clear",
      percent: Math.min(100, stats.pendingReports * 10),
      colorClass: stats.pendingReports > 0 ? "bg-red-500" : "bg-slate-300",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 font-outfit">Operations Map</h3>
          <p className="text-xs text-slate-500">
            Platform load, health, and moderation signals in one operational view.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px]">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
            <Users size={15} />
            <p className="mt-1 text-sm font-bold">{getPercent(stats.activeUsers, stats.totalUsers)}%</p>
            <p className="text-[10px] font-semibold uppercase">Active</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
            <MessageSquare size={15} />
            <p className="mt-1 text-sm font-bold">{formatNumber(stats.totalMessages)}</p>
            <p className="text-[10px] font-semibold uppercase">Messages</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-red-700">
            <ShieldAlert size={15} />
            <p className="mt-1 text-sm font-bold">{formatNumber(stats.pendingReports)}</p>
            <p className="text-[10px] font-semibold uppercase">Reports</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-slate-700">
            <Activity size={15} />
            <p className="mt-1 text-sm font-bold">{getPercent(healthUpCount, stats.systemHealth.length)}%</p>
            <p className="text-[10px] font-semibold uppercase">Health</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
        {lanes.map((lane) => (
          <div key={lane.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">{lane.label}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{lane.value}</p>
              </div>
              <span className="text-xs font-bold text-slate-500">{lane.percent}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
              <div className={`h-full rounded-full ${lane.colorClass}`} style={{ width: `${lane.percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{lane.helper}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
