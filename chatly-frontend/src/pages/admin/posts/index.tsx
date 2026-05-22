import { useCallback, useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin.service";
import { postService } from "@/services/post.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { Post } from "@/types/post";
import {
  Calendar,
  FileText,
  Hash,
  Heart,
  Loader2,
  MessageCircle,
  Search,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 20, 30];

function getReactionCount(post: Post) {
  return post.reactions.reduce((total, item) => total + item.count, 0);
}

function getHashtagFromQuery(query: string) {
  const trimmed = query.trim();
  return trimmed.startsWith("#") ? trimmed.slice(1) : null;
}

export default function PostsPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const visibleRange = useMemo(() => {
    if (totalElements === 0) {
      return "0";
    }

    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalElements);
    return `${start}-${end}`;
  }, [page, pageSize, totalElements]);

  const fetchPosts = useCallback(
    async (pageNumber: number, size: number) => {
      setIsLoading(true);
      try {
        const hashtag = getHashtagFromQuery(activeQuery);
        const keyword = hashtag ? null : activeQuery.trim() || null;
        const response = await postService.searchPosts(keyword, hashtag, pageNumber, size);

        if (response.code === 1000) {
          setPosts(response.result.content);
          setTotalElements(response.result.totalElements);
          setTotalPages(response.result.totalPages);
        } else {
          toast.error(response.message || "Failed to load posts");
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load posts";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [activeQuery]
  );

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const [statsResponse, hashtagsResponse] = await Promise.all([
          adminService.getStats(),
          postService.getTrendingHashtags(8),
        ]);

        if (statsResponse.code === 1000) {
          setStats(statsResponse.result);
        }
        if (hashtagsResponse.code === 1000) {
          setHashtags(hashtagsResponse.result);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load post overview";
        toast.error(message);
      }
    };

    loadOverview();
  }, []);

  useEffect(() => {
    fetchPosts(page, pageSize);
  }, [fetchPosts, page, pageSize]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setActiveQuery(query);
  };

  const handleHashtagSelect = (tag: string) => {
    const nextQuery = `#${tag}`;
    setQuery(nextQuery);
    setActiveQuery(nextQuery);
    setPage(0);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setPage(0);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Platform Posts
          </p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5 font-outfit">
            {(stats?.totalPosts ?? 0).toLocaleString()}
          </h3>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Search Results
          </p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5 font-outfit">
            {totalElements.toLocaleString()}
          </h3>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Showing
          </p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5 font-outfit">
            {visibleRange}
          </h3>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search posts or #hashtag..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition-all"
            />
          </form>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Rows</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleHashtagSelect(tag)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-all"
              >
                <Hash size={12} />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-72 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">No posts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Post
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Author
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Engagement
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Visibility
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/40">
                    <td className="px-5 py-4 max-w-xl">
                      <p className="text-sm font-medium text-slate-700 line-clamp-2">
                        {post.content || "Media-only post"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            post.authorAvatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              post.authorDisplayName || post.authorUsername || "User"
                            )}&background=7c3aed&color=fff&size=80`
                          }
                          alt={post.authorDisplayName || post.authorUsername || "User"}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {post.authorDisplayName || "Unknown user"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            @{post.authorUsername || "unknown"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Heart size={13} /> {getReactionCount(post)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={13} /> {post.commentCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 size={13} /> {post.shareCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                        {post.visibility}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={13} />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
