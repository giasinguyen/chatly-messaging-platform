import { useCallback, useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { Post } from "@/types/post";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { TrendingUp, Loader2, FileText, MessageSquare, Share2, Flame } from "lucide-react";
import { toast } from "sonner";

const TRENDING_TODO_NOTE =
  "Backend trending API not yet available. Implement when GET /api/admin/analytics/trending is ready.";

const DEFAULT_PAGE_SIZE = 10;

export default function TrendingPage() {
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTopPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Approximating trending: fetch recent admin posts and sort by share/reaction count locally.
      // TODO: Replace with a dedicated GET /api/admin/analytics/trending endpoint when available.
      const res = await adminService.listPosts({ page: 0, size: DEFAULT_PAGE_SIZE });
      if (res.code === 1000) {
        const sorted = [...res.result.items].sort(
          (a, b) => (b.shareCount + b.commentCount) - (a.shareCount + a.commentCount)
        );
        setTopPosts(sorted);
      } else {
        toast.error(res.message || "Failed to load posts");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load posts";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopPosts();
  }, [loadTopPosts]);

  const totalShares = topPosts.reduce((sum, p) => sum + p.shareCount, 0);
  const totalComments = topPosts.reduce((sum, p) => sum + p.commentCount, 0);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <DashboardKpiCard
          label="Posts Sampled"
          value={topPosts.length.toLocaleString()}
          helper="From admin post index"
          icon={FileText}
          colorClass="text-purple-600 bg-purple-50 border-purple-100"
        />
        <DashboardKpiCard
          label="Total Shares"
          value={totalShares.toLocaleString()}
          helper="In sampled posts"
          icon={Share2}
          colorClass="text-blue-600 bg-blue-50 border-blue-100"
        />
        <DashboardKpiCard
          label="Total Comments"
          value={totalComments.toLocaleString()}
          helper="In sampled posts"
          icon={MessageSquare}
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
      </div>

      {/* Top posts by engagement proxy */}
      {topPosts.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">Most Shared Posts (Last Page)</p>
            <span className="text-[11px] text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg font-semibold">
              Proxy — real trending API pending
            </span>
          </div>
          <ul className="divide-y divide-slate-50">
            {topPosts.map((post, index) => (
              <li key={post.id} className="px-5 py-3 hover:bg-slate-50/60">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-slate-300 mt-0.5 w-5 shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 line-clamp-2">{post.content || "(no text)"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      @{post.authorUsername ?? post.authorId} · {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Share2 size={11} />{post.shareCount}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} />{post.commentCount}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trending analytics placeholder */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
        <Flame size={28} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-500 mb-1">Trending Topics & Viral Content</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Real-time trending scores, velocity tracking, and geographic heat maps require a
          dedicated backend analytics service. The post list above is a temporary proxy.
        </p>
        <code className="mt-3 block text-[11px] text-slate-400 bg-slate-100 rounded-lg px-3 py-2 max-w-lg mx-auto">
          {TRENDING_TODO_NOTE}
        </code>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-[#7c3aed]" />
          <h3 className="text-sm font-bold text-slate-700">Discovery Feed Signals</h3>
        </div>
        <p className="text-xs text-slate-400">
          Hashtag trending velocity, content discovery recommendations, and "For You" ranking
          signals are managed by the AI Agent service.{" "}
          <span className="font-semibold text-slate-500">
            See the AI Agent module for agent session and performance data.
          </span>
        </p>
      </div>
    </div>
  );
}
