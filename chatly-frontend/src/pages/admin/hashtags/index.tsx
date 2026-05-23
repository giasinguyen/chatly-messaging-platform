import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminService } from "@/services/admin.service";
import type { Post } from "@/types/post";
import { Hash, Loader2, Search, FileText } from "lucide-react";
import { toast } from "sonner";

const HASHTAG_TODO_NOTE =
  "Dedicated hashtag analytics API not yet available. Implement when GET /api/admin/hashtags is ready.";

export default function HashtagsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchByHashtag = useCallback(async (hashtag: string) => {
    if (!hashtag.trim()) return;
    setIsLoading(true);
    setPosts([]);
    try {
      // Using the admin post list endpoint as a proxy for hashtag search.
      // TODO: Replace with a dedicated GET /api/admin/hashtags endpoint when available.
      const res = await adminService.listPosts({ q: hashtag.trim(), page: 0, size: 30 });
      if (res.code === 1000) {
        const items = res.result.items ?? [];
        setPosts(items);
        if (items.length === 0) {
          toast.info(`No posts found matching "${hashtag}"`);
        }
      } else {
        toast.error(res.message || "Failed to search posts");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to search posts";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeQuery) {
      searchByHashtag(activeQuery);
    }
  }, [activeQuery, searchByHashtag]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = searchQuery.startsWith("#") ? searchQuery.slice(1) : searchQuery;
    setActiveQuery(q.trim());
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Search proxy via admin posts */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-1">Search Posts by Hashtag</h3>
        <p className="text-xs text-slate-400 mb-4">
          Searching the admin post index for a given hashtag keyword. This is a proxy until a
          dedicated hashtag analytics endpoint is available.
        </p>
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="e.g. travel or #photography"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </form>
      </div>

      {/* Results */}
      {activeQuery && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">
              Results for <span className="text-[#7c3aed]">#{activeQuery}</span>
            </p>
            <span className="text-xs text-slate-400">{posts.length} posts</span>
          </div>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#7c3aed]" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <FileText size={24} />
              <p className="text-xs">No posts found</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {posts.map((post) => (
                <li key={post.id} className="px-5 py-3 hover:bg-slate-50/60">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{post.content ?? "(no text)"}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        By @{post.authorUsername ?? post.authorId} · {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
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
      )}

      {/* Hashtag analytics placeholder */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
        <Hash size={28} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-500 mb-1">Hashtag Analytics Dashboard</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Top hashtags by usage count, trending velocity, and geographic distribution require a
          dedicated backend API. The post search above is a temporary proxy.
        </p>
        <code className="mt-3 block text-[11px] text-slate-400 bg-slate-100 rounded-lg px-3 py-2 max-w-lg mx-auto">
          {HASHTAG_TODO_NOTE}
        </code>
      </div>
    </div>
  );
}
