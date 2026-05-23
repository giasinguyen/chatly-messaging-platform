import type { LucideIcon } from "lucide-react";

interface DashboardKpiCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  colorClass: string;
  trend?: string;
}

export function DashboardKpiCard({
  label,
  value,
  helper,
  icon: Icon,
  colorClass,
  trend,
}: DashboardKpiCardProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5 font-outfit">
            {value}
          </h3>
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${colorClass}`}
        >
          <Icon size={20} className="stroke-[2.2]" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 font-medium truncate">{helper}</span>
        {trend && (
          <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold shrink-0">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export default DashboardKpiCard;
