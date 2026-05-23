import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { Post } from "@/types/post";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import {
  TrendingUp,
  Loader2,
  FileText,
  MessageSquare,
  Share2,
  Hash,
  BarChart2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

interface TagFreq {
  tag: string;
  count: number;
}

function computeTagFrequency(posts: Post[]): TagFreq[] {
  const freq: Record<string, number> = {};
  for (const post of posts) {
    for (const tag of post.hashtags ?? []) {
      const key = tag.toLowerCase().replace(/^#/, "");
      freq[key] = (freq[key] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export default function TrendingPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [trendingTags, setTrendingTags] = useState<TagFreq[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.all([adminService.getStats(), adminService.listPosts({ page: 0, size: 30 })])
      .then(([statsRes, postsRes]) => {
        if (cancelled) return;
        if (statsRes.code === 1000) setStats(statsRes.result);
        else toast.error(statsRes.message || "Failed to load stats");

        if (postsRes.code === 1000) {
          const sorted = [...postsRes.result.items].sort(
            (a, b) => (b.shareCount + b.commentCount) - (a.shareCount + a.commentCount)
          );
          setTopPosts(sorted.slice(0, 10));
          setTrendingTags(computeTagFrequency(postsRes.result.items));
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load trending data";
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

  const totalShares = topPosts.reduce((s, p) => s + p.shareCount, 0);
  const totalComments = topPosts.reduce((s, p) => s + p.commentCount, 0);
  const maxMsg = Math.max(...(stats?.messageActivity.map((p) => p.count) ?? [1]), 1);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardKpiCard
          label="Total Posts"
          value={stats?.totalPosts.toLocaleString() ?? "—"}
          helper="Platform-wide content"
          icon={FileText}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Total Shares"
          value={totalShares.toLocaleString()}
          helper="From top 10 posts"
          icon={Share2}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
        <DashboardKpiCard
          label="Total Comments"
          value={totalComments.toLocaleString()}
          helper="From top 10 posts"
          icon={MessageSquare}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <DashboardKpiCard
          label="Trending Tags"
          value={trendingTags.length.toLocaleString()}
          helper="Active hashtags found"
          icon={Hash}
          colorClass="text-amber-600 bg-amber-50 border-amber-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Posts Leaderboard — GET /api/admin/posts sorted by shareCount+commentCount */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">Top Posts by Engagement</p>
            <span className="text-[10px] text-slate-400">shares + comments</span>
          </div>
          {topPosts.length > 0 ? (
            <ul className="divide-y divide-slate-50">
              {topPosts.map((post, i) => {
                const engagement = post.shareCount + post.commentCount;
                const maxEngage = topPosts[0].shareCount + topPosts[0].commentCount || 1;
                return (
                  <li key={post.id} className="px-5 py-3 hover:bg-slate-50/60 flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 shrink-0 ${i < 3 ? "text-[#7c3aed]" : "text-slate-300"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700 line-clamp-1">{post.content || "(no text)"}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-400">@{post.authorUsername ?? post.authorId}</span>
                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-[#7c3aed] to-[#a855f7]"
                            style={{ width: `${Math.round((engagement / maxEngage) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Share2 size={10} />{post.shareCount}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={10} />{post.commentCount}</span>
                      <span className="font-bold text-[#7c3aed] bg-purple-50 border border-purple-100 rounded-lg px-2 py-0.5">
                        {engagement}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex h-36 items-center justify-center text-slate-400 text-xs">
              No posts available
            </div>
          )}
        </div>

        {/* Trending Hashtags — extracted from top posts */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3">
            <p className="text-xs font-bold text-slate-700">Trending Hashtags</p>
            <p className="text-[10px] text-slate-400 mt-0.5">by frequency in recent 30 posts</p>
          </div>
          {trendingTags.length > 0 ? (
            <ul className="divide-y divide-slate-50">
              {trendingTags.map(({ tag, count }, i) => (
                <li key={tag} className="px-5 py-2.5 flex items-center gap-3">
                  <span className={`text-xs font-bold w-5 ${i < 3 ? "text-amber-400" : "text-slate-300"}`}>{i + 1}</span>
                  <span className="text-xs font-semibold text-[#7c3aed] flex-1 truncate">#{tag}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-36 flex-col items-center justify-center gap-2 text-slate-400">
              <Hash size={20} />
              <p className="text-xs">No hashtags found</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Activity Mini Chart — GET /api/admin/stats → messageActivity[] */}
      {stats?.messageActivity && stats.messageActivity.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={14} className="text-[#7c3aed]" />
            <p className="text-sm font-bold text-slate-700">Message Activity (Last 7 Days)</p>
          </div>
          <div className="flex items-end gap-2" style={{ height: "100px" }}>
            {stats.messageActivity.map((point) => {
              const heightPct = Math.max(Math.round((point.count / maxMsg) * 100), 2);
              return (
                <div key={point.date} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                  <span className="text-[9px] text-slate-400 font-semibold">{point.count}</span>
                  <div
                    className="w-full rounded-t-lg bg-linear-to-t from-[#7c3aed]/70 to-[#a855f7]/40"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] text-slate-300 truncate w-full text-center">{point.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

