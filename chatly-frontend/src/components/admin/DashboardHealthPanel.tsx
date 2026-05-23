import { AlertTriangle, CheckCircle, Server } from "lucide-react";
import type { SystemHealthStatus } from "@/types/admin";

interface DashboardHealthPanelProps {
  items: SystemHealthStatus[];
}

function getHealthScore(items: SystemHealthStatus[]) {
  if (items.length === 0) {
    return 0;
  }

  const upCount = items.filter((item) => item.status === "UP").length;
  return Math.round((upCount / items.length) * 100);
}

export function DashboardHealthPanel({ items }: DashboardHealthPanelProps) {
  const hasIssues = items.some((item) => item.status === "DOWN");
  const healthScore = getHealthScore(items);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm h-full">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="font-bold text-slate-800 text-lg font-outfit">
            System Health
          </h3>
          <p className="text-xs text-slate-500">Current subsystem availability</p>
        </div>
        <div
          className={`px-3 py-1 rounded-lg text-xs font-bold border ${
            hasIssues
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}
        >
          {healthScore}%
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.service}
            className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                  item.status === "UP"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                    : "bg-red-50 border-red-100 text-red-600"
                }`}
              >
                <Server size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-800 block truncate">
                  {item.service}
                </span>
                <span className="text-[11px] text-slate-400 block truncate">
                  {item.description}
                </span>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                item.status === "UP"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-red-50 text-red-600 border-red-100"
              }`}
            >
              {item.status === "UP" ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-400">
          No health checks returned
        </div>
      )}
    </div>
  );
}

export default DashboardHealthPanel;
