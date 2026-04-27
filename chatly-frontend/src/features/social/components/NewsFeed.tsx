import { useCallback, useEffect, useRef, useState } from "react";
import { postService } from "@/services/post.service";
import { usePostStore } from "@/store/post.store";
import { useAuthStore } from "@/store/auth.store";
import { PostCard } from "./PostCard";
import { CreatePostModal } from "./CreatePostModal";
import { Button } from "@/components/ui/button";
import { PenSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/types/post";

const PAGE_SIZE = 10;

export function NewsFeed() {
    const { feed, hasMore, page, loadingFeed, setFeed, appendFeed, nextPage, setLoadingFeed } =
        usePostStore();
    const currentUser = useAuthStore((s) => s.user);

    const [modalOpen, setModalOpen] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const loadPage = useCallback(
        async (pageNum: number) => {
            setLoadingFeed(true);
            try {
                const res = await postService.getFeed(pageNum, PAGE_SIZE);
                if (res.code === 1000 && res.result) {
                    const { content, last } = res.result;
                    if (pageNum === 0) {
                        setFeed(content, !last);
                    } else {
                        appendFeed(content, !last);
                    }
                }
            } catch {
                toast.error("Failed to load feed.");
            } finally {
                setLoadingFeed(false);
            }
        },
        [setFeed, appendFeed, setLoadingFeed],
    );

    // Initial load
    useEffect(() => {
        loadPage(0);
    }, [loadPage]);

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        if (!sentinelRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMore && !loadingFeed) {
                    nextPage();
                    loadPage(page + 1);
                }
            },
            { threshold: 0.1 },
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingFeed, page, nextPage, loadPage]);

    return (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
            {/* Compose button */}
            {currentUser && (
                <div
                    className="flex items-center gap-3 rounded-3xl bg-white shadow-sm border border-gray-100 px-4 py-3 cursor-pointer"
                    onClick={() => setModalOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setModalOpen(true)}
                >
                    <img
                        src={currentUser.avatarUrl ?? "/default-avatar.png"}
                        alt=""
                        className="size-9 rounded-full object-cover"
                    />
                    <span className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-400 select-none">
                        What's on your mind, {currentUser.displayName}?
                    </span>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        className="rounded-xl text-indigo-500"
                        tabIndex={-1}
                    >
                        <PenSquare className="size-4" />
                    </Button>
                </div>
            )}

            {/* Posts */}
            {feed.map((post: Post) => (
                <PostCard key={post.id} post={post} />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} />

            {loadingFeed && (
                <div className="flex justify-center py-6">
                    <Loader2 className="size-6 animate-spin text-indigo-400" />
                </div>
            )}

            {!hasMore && feed.length > 0 && (
                <p className="py-6 text-center text-xs text-gray-400">
                    You've reached the end of your feed.
                </p>
            )}

            <CreatePostModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
    );
}
