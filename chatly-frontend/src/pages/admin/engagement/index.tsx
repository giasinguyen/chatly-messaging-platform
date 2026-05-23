import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { Post } from "@/types/post";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import {
  BarChart2,
  Loader2,
  MessageSquare,
  Share2,
  Users,
  FileText,
  MessageCircle,
  Flame,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function EngagementPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.all([adminService.getStats(), adminService.listPosts({ page: 0, size: 20 })])
      .then(([statsRes, postsRes]) => {
        if (cancelled) return;
        if (statsRes.code === 1000) setStats(statsRes.result);
        else toast.error(statsRes.message || "Failed to load stats");

        if (postsRes.code === 1000) {
          const sorted = [...postsRes.result.items].sort(
            (a, b) => (b.shareCount + b.commentCount) - (a.shareCount + a.commentCount)
          );
          setTopPosts(sorted.slice(0, 8));
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load engagement data";
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

  const maxMsgActivity = Math.max(...(stats?.messageActivity.map((p) => p.count) ?? [1]), 1);
  const weeklyMessages = stats?.messageActivity.reduce((s, p) => s + p.count, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* KPI Cards — real data from GET /api/admin/stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardKpiCard
          label="Total Posts"
          value={stats?.totalPosts.toLocaleString() ?? "—"}
          helper="All platform posts"
          icon={FileText}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Messages (7d)"
          value={weeklyMessages.toLocaleString()}
          helper="Last 7 days volume"
          icon={MessageSquare}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
        <DashboardKpiCard
          label="Active Users"
          value={stats?.activeUsers.toLocaleString() ?? "—"}
          helper="Active in last 24 h"
          icon={Users}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <DashboardKpiCard
          label="Pending Reports"
          value={stats?.pendingReports.toLocaleString() ?? "—"}
          helper="Awaiting moderation"
          icon={Flame}
          colorClass="text-red-600 bg-red-50 border-red-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Message Activity Chart — GET /api/admin/stats → messageActivity[] */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-slate-700">Message Activity</p>
              <p className="text-xs text-slate-400 mt-0.5">Messages sent per day — last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7c3aed] bg-purple-50 border border-purple-100 rounded-xl px-3 py-1.5">
              <BarChart2 size={12} />
              {weeklyMessages.toLocaleString()} total
            </div>
          </div>
          {stats?.messageActivity && stats.messageActivity.length > 0 ? (
            <div className="flex items-end gap-2" style={{ height: "140px" }}>
              {stats.messageActivity.map((point) => {
                const heightPct = Math.max(Math.round((point.count / maxMsgActivity) * 100), 2);
                return (
                  <div key={point.date} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                    <span className="text-[9px] text-slate-400 font-semibold">{point.count}</span>
                    <div
                      className="w-full rounded-t-lg bg-linear-to-t from-[#7c3aed] to-[#a855f7]"
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
              No message data available
            </div>
          )}
        </div>

        {/* Recent Activity Feed — GET /api/admin/stats → recentActivity[] */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3">
            <p className="text-xs font-bold text-slate-700">Recent Platform Activity</p>
          </div>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <ul className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
              {stats.recentActivity.map((item) => (
                <li key={item.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {item.type === "USER_SIGNUP" ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                          <Users size={10} className="text-emerald-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
                          <Flame size={10} className="text-red-500" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 leading-tight">{item.title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.description}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-36 items-center justify-center text-slate-400 text-xs">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Top Posts by Engagement — GET /api/admin/posts, sorted by shareCount+commentCount */}
      {topPosts.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">Top Posts by Engagement</p>
            <span className="text-[10px] text-slate-400">shares + comments</span>
          </div>
          <ul className="divide-y divide-slate-50">
            {topPosts.map((post, i) => {
              const engagement = post.shareCount + post.commentCount;
              return (
                <li key={post.id} className="px-5 py-3 hover:bg-slate-50/60 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 w-5 shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 line-clamp-1">{post.content || "(no text)"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">@{post.authorUsername ?? post.authorId}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Share2 size={11} />{post.shareCount}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={11} />{post.commentCount}</span>
                    <span className="font-bold text-[#7c3aed] bg-purple-50 border border-purple-100 rounded-lg px-2 py-0.5">
                      {engagement}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
