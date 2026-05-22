interface DashboardBreakdownItem {
  label: string;
  value: number;
  percentage: number;
  colorClass: string;
}

interface DashboardBreakdownCardProps {
  title: string;
  subtitle: string;
  items: DashboardBreakdownItem[];
  footer?: string;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function DashboardBreakdownCard({
  title,
  subtitle,
  items,
  footer,
}: DashboardBreakdownCardProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm h-full">
      <div className="mb-5">
        <h3 className="font-bold text-slate-800 text-lg font-outfit">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const percent = clampPercent(item.percentage);
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-600">{item.label}</span>
                <span className="font-bold text-slate-800">
                  {item.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.colorClass}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-[10px] font-semibold text-slate-400">
                {percent.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>

      {footer && (
        <div className="mt-5 pt-4 border-t border-slate-50 text-xs font-medium text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}

export default DashboardBreakdownCard;
