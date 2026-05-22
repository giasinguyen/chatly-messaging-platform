import React, { useEffect, useState, useCallback } from "react";
import axiosClient from "@/lib/axiosClient";
import type { ApiResponse } from "@/types/auth";
import type { SpringPage, PostResponse } from "@/types/admin";
import {
  Search,
  Loader2,
  FileText,
  Hash,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export const PostsPage: React.FC = () => {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const fetchPosts = useCallback(async (query: string, pageNum: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        size: PAGE_SIZE.toString(),
      });
      if (query.trim()) {
        if (query.startsWith("#")) {
          params.set("hashtag", query.slice(1));
        } else {
          params.set("q", query);
        }
      }
      const response = await axiosClient.get<ApiResponse<SpringPage<PostResponse>>>(
        `/api/posts/search?${params.toString()}`
      );
      if (response.data.code === 1000 && response.data.result) {
        setPosts(response.data.result.content);
        setTotalPages(response.data.result.totalPages);
        setTotalElements(response.data.result.totalElements);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load posts";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchPosts(debouncedQuery, 0);
  }, [debouncedQuery, fetchPosts]);

  useEffect(() => {
    fetchPosts(debouncedQuery, page);
  }, [page, debouncedQuery, fetchPosts]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-outfit">
            Post Management
          </h1>
          <p className="text-sm text-slate-500">
            Browse and search platform posts ({totalElements.toLocaleString()} total)
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search posts or #hashtag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition-all"
          />
        </div>
      </div>

      {/* Post List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">No posts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={
                      post.authorAvatar ||
                      `https://ui-avatars.com/api/?name=${post.authorDisplayName}&background=7c3aed&color=fff&size=80`
                    }
                    alt={post.authorDisplayName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {post.authorDisplayName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      @{post.authorUsername} ·{" "}
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase">
                  {post.visibility}
                </span>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mb-3 line-clamp-3">
                {post.content}
              </p>

              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-0.5 text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg"
                    >
                      <Hash size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-5 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Heart size={13} /> {post.reactionCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={13} /> {post.commentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 size={13} /> {post.shareCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
export default PostsPage;
