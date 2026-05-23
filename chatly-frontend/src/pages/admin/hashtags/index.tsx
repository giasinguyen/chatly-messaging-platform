import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminService } from "@/services/admin.service";
import type { Post } from "@/types/post";
import { Hash, Loader2, Search, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface HashtagCount {
  tag: string;
  count: number;
}

function extractHashtagFrequency(posts: Post[]): HashtagCount[] {
  const freq: Record<string, number> = {};
  for (const post of posts) {
    for (const tag of post.hashtags ?? []) {
      const normalized = tag.toLowerCase().replace(/^#/, "");
      freq[normalized] = (freq[normalized] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export default function HashtagsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [topHashtags, setTopHashtags] = useState<HashtagCount[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTop, setIsLoadingTop] = useState(true);

  // Load recent posts on mount to extract top hashtags
  useEffect(() => {
    let cancelled = false;
    adminService
      .listPosts({ page: 0, size: 50 })
      .then((res) => {
        if (cancelled) return;
        if (res.code === 1000) {
          setTopHashtags(extractHashtagFrequency(res.result.items));
        }
      })
      .catch(() => { /* silent — top hashtags are supplemental */ })
      .finally(() => { if (!cancelled) setIsLoadingTop(false); });
    return () => { cancelled = true; };
  }, []);

  // Search by hashtag using dedicated ?hashtag= param (GET /api/admin/posts?hashtag=X)
  const runSearch = useCallback(async (hashtag: string) => {
    if (!hashtag.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await adminService.listPosts({ hashtag: hashtag.trim(), page: 0, size: 30 });
      if (res.code === 1000) {
        setSearchResults(res.result.items);
        if (res.result.items.length === 0) {
          toast.info(`No posts found with hashtag #${hashtag}`);
        }
      } else {
        toast.error(res.message || "Search failed");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Search failed";
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (activeQuery) runSearch(activeQuery);
  }, [activeQuery, runSearch]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = searchQuery.trim().replace(/^#/, "");
    setActiveQuery(q);
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(`#${tag}`);
    setActiveQuery(tag);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Search bar — uses GET /api/admin/posts?hashtag=X (dedicated param) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold text-slate-700 mb-1">Search Posts by Hashtag</p>
        <p className="text-xs text-slate-400 mb-4">
          Uses <code className="bg-slate-100 px-1 rounded text-[10px]">GET /api/admin/posts?hashtag=&#123;tag&#125;</code> — exact hashtag lookup from MongoDB index.
        </p>
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="e.g. travel or #photography"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-50"
          >
            {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Hashtags panel — extracted from GET /api/admin/posts?page=0&size=50 */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3 flex items-center gap-2">
            <TrendingUp size={13} className="text-[#7c3aed]" />
            <p className="text-xs font-bold text-slate-700">Top Hashtags</p>
            <span className="ml-auto text-[10px] text-slate-400">from recent 50 posts</span>
          </div>
          {isLoadingTop ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#7c3aed]" />
            </div>
          ) : topHashtags.length > 0 ? (
            <ul className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
              {topHashtags.map(({ tag, count }, i) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-purple-50/60 text-left transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-300 w-5 shrink-0">{i + 1}</span>
                    <span className="text-xs font-semibold text-[#7c3aed] flex-1">#{tag}</span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                      {count} post{count !== 1 ? "s" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <Hash size={20} />
              <p className="text-xs">No hashtags found in recent posts</p>
            </div>
          )}
        </div>

        {/* Search results */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">
              {activeQuery ? (
                <>Results for <span className="text-[#7c3aed]">#{activeQuery}</span></>
              ) : (
                "Search results"
              )}
            </p>
            {activeQuery && (
              <span className="text-[10px] text-slate-400">{searchResults.length} posts</span>
            )}
          </div>
          {isSearching ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={22} className="animate-spin text-[#7c3aed]" />
            </div>
          ) : !activeQuery ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <Hash size={22} />
              <p className="text-xs">Enter a hashtag to search, or click a tag on the left</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <FileText size={22} />
              <p className="text-xs">No posts found with this hashtag</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 max-h-105 overflow-y-auto">
              {searchResults.map((post) => (
                <li key={post.id} className="px-5 py-3 hover:bg-slate-50/60">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 line-clamp-2">{post.content || "(no text)"}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(post.hashtags ?? []).slice(0, 5).map((tag) => (
                          <span key={tag} className="text-[10px] text-[#7c3aed] bg-purple-50 border border-purple-100 rounded-md px-1.5 py-0.5">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        @{post.authorUsername ?? post.authorId} · {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                      {post.visibility}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

