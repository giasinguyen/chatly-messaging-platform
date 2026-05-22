import { Clock, ShieldAlert, TrendingUp } from "lucide-react";
import type { AdminActivityLog } from "@/types/admin";

interface DashboardActivityTimelineProps {
  items: AdminActivityLog[];
}

function formatActivityDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString();
}

export function DashboardActivityTimeline({ items }: DashboardActivityTimelineProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm h-full">
      <h3 className="font-bold text-slate-800 text-lg font-outfit mb-1">
        Activity Timeline
      </h3>
      <p className="text-xs text-slate-500 mb-5">Recent signups and moderation events</p>

      <div className="relative border-l-2 border-slate-100 ml-3 pl-5 space-y-5">
        {items.map((activity) => {
          const isSignup = activity.type === "USER_SIGNUP";
          return (
            <div key={activity.id} className="relative">
              <span
                className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                  isSignup ? "bg-purple-500" : "bg-red-500"
                }`}
              />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {isSignup ? (
                      <TrendingUp size={12} className="text-purple-400" />
                    ) : (
                      <ShieldAlert size={12} className="text-red-400" />
                    )}
                    <h4 className="text-sm font-bold text-slate-800 truncate">
                      {activity.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                  <Clock size={10} />
                  {formatActivityDate(activity.timestamp)}
                </span>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm">
            No recent events logged
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardActivityTimeline;
