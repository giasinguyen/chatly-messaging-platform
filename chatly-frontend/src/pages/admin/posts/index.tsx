import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import AdminDetailPanel from "@/components/admin/AdminDetailPanel";
import AdminPostDetailContent from "@/components/admin/AdminPostDetailContent";
import { DashboardKpiCard } from "@/components/admin/DashboardKpiCard";
import { adminService } from "@/services/admin.service";
import type { AdminStatsResponse } from "@/types/admin";
import type { Post } from "@/types/post";
import { FileText, Hash, Heart, Loader2, MessageCircle, Search, Share2, Trash2 } from "lucide-react";
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
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const visibleRange = useMemo(() => {
    if (totalElements === 0) {
      return "0";
    }
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalElements);
    return `${start}-${end}`;
  }, [page, pageSize, totalElements]);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const hashtag = getHashtagFromQuery(activeQuery);
      const response = await adminService.listPosts({
        q: hashtag ? undefined : activeQuery.trim() || undefined,
        hashtag: hashtag || undefined,
        page,
        size: pageSize,
      });

      if (response.code === 1000) {
        setPosts(response.result.items);
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
  }, [activeQuery, page, pageSize]);

  useEffect(() => {
    adminService.getStats().then((response) => {
      if (response.code === 1000) {
        setStats(response.result);
      }
    });
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const mediaPostCount = useMemo(
    () => posts.filter((post) => post.mediaUrls.length > 0).length,
    [posts]
  );
  const engagementOnPage = useMemo(
    () => posts.reduce((total, post) => total + getReactionCount(post) + post.commentCount + post.shareCount, 0),
    [posts]
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setActiveQuery(query);
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setPage(0);
  };

  const handleOpenDetail = async (post: Post) => {
    setSelectedPost(post);
    try {
      const response = await adminService.getPost(post.id);
      if (response.code === 1000) {
        setSelectedPost(response.result);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load post detail";
      toast.error(message);
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!confirm("Delete this post permanently?")) {
      return;
    }
    setDeletingPostId(post.id);
    try {
      const response = await adminService.deletePost(post.id);
      if (response.code === 1000) {
        setPosts((current) => current.filter((item) => item.id !== post.id));
        setSelectedPost(null);
        setTotalElements((current) => Math.max(0, current - 1));
        toast.success("Post deleted");
      } else {
        toast.error(response.message || "Failed to delete post");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete post";
      toast.error(message);
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <DashboardKpiCard label="Platform Posts" value={(stats?.totalPosts ?? totalElements).toLocaleString()} helper="Admin-wide total" icon={FileText} colorClass="text-purple-600 bg-purple-50 border-purple-100" />
        <DashboardKpiCard label="Result Set" value={totalElements.toLocaleString()} helper="Current filters" icon={Search} colorClass="text-blue-600 bg-blue-50 border-blue-100" />
        <DashboardKpiCard label="Media Page" value={mediaPostCount.toLocaleString()} helper="Posts with assets" icon={Hash} colorClass="text-amber-600 bg-amber-50 border-amber-100" />
        <DashboardKpiCard label="Engagement Page" value={engagementOnPage.toLocaleString()} helper={`Showing ${visibleRange}`} icon={Heart} colorClass="text-rose-600 bg-rose-50 border-rose-100" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts or #hashtag..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20" />
        </form>
        <select value={pageSize} onChange={handlePageSizeChange} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 outline-none">
          {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} rows</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center"><Loader2 size={28} className="animate-spin text-[#7c3aed]" /></div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No posts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Post</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Author</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Engagement</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-400">Visibility</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {posts.map((post) => (
                  <tr key={post.id} onClick={() => handleOpenDetail(post)} className="cursor-pointer hover:bg-slate-50/60">
                    <td className="max-w-xl px-5 py-4">
                      <p className="line-clamp-2 text-sm font-medium text-slate-700">{post.content || "Media-only post"}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{post.id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-800">{post.authorDisplayName || "Unknown user"}</p>
                      <p className="text-[11px] text-slate-400">@{post.authorUsername || "unknown"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Heart size={13} />{getReactionCount(post)}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={13} />{post.commentCount}</span>
                        <span className="flex items-center gap-1"><Share2 size={13} />{post.shareCount}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">{post.visibility}</span></td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={(event) => { event.stopPropagation(); handleDeletePost(post); }} disabled={deletingPostId === post.id} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"><Trash2 size={16} /></button>
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
          <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Previous</button>
          <span className="text-xs font-medium text-slate-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Next</button>
        </div>
      )}

      {selectedPost && (
        <AdminDetailPanel
          title="Post Detail"
          subtitle={selectedPost.id}
          onClose={() => setSelectedPost(null)}
          footer={<button type="button" onClick={() => handleDeletePost(selectedPost)} disabled={deletingPostId === selectedPost.id} className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">Delete Post</button>}
        >
          <AdminPostDetailContent post={selectedPost} />
        </AdminDetailPanel>
      )}
    </div>
  );
}
