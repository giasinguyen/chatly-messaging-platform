import { useCallback, useEffect, useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/features/social/components/PostCard";
import { PostCardSkeleton } from "@/pages/app/feed/components/PostCardSkeleton";
import { SAVED_POSTS_PAGE_SIZE } from "@/constants/feed";
import { postService } from "@/services/post.service";
import type { Post } from "@/types/post";
import { SocialErrorBoundary } from "@/features/social/components/SocialErrorBoundary";

const INITIAL_PAGE = 0;

export default function SavedPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(INITIAL_PAGE);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSavedPosts = useCallback(async (targetPage: number) => {
        const isInitial = targetPage === INITIAL_PAGE;
        if (isInitial) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            setError(null);
            const response = await postService.getSavedPosts(
                targetPage,
                SAVED_POSTS_PAGE_SIZE,
            );
            if (response.code !== 1000 || !response.result) {
                throw new Error(response.message ?? "Could not load saved posts.");
            }

            setPosts((current) =>
                isInitial
                    ? response.result.content
                    : [...current, ...response.result.content],
            );
            setPage(response.result.number);
            setHasMore(!response.result.last);
        } catch (loadError: unknown) {
            const message =
                loadError instanceof Error
                    ? loadError.message
                    : "Could not load saved posts.";
            setError(message);
            if (!isInitial) {
                toast.error(message);
            }
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        void loadSavedPosts(INITIAL_PAGE);
    }, [loadSavedPosts]);

    const handlePostUpdate = useCallback((postId: string, updates: Partial<Post>) => {
        if (updates.savedByMe === false) {
            setPosts((current) => current.filter((post) => post.id !== postId));
            return;
        }
        setPosts((current) =>
            current.map((post) =>
                post.id === postId ? { ...post, ...updates } : post,
            ),
        );
    }, []);

    const handlePostRemove = useCallback((postId: string) => {
        setPosts((current) => current.filter((post) => post.id !== postId));
    }, []);

    const handleLoadMore = () => {
        if (!hasMore || isLoadingMore) return;
        void loadSavedPosts(page + 1);
    };

    const handleRetryInitialLoad = () => {
        void loadSavedPosts(INITIAL_PAGE);
    };

    return (
        <SocialErrorBoundary
            title="Saved posts are unavailable"
            message="This section failed to render. Try again."
        >
            <div className="h-full w-full overflow-y-auto bg-background">
            <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8 pb-32">
                <header className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <Bookmark className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Saved posts
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Posts you bookmarked are collected here.
                        </p>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex flex-col gap-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <PostCardSkeleton key={`saved-skeleton-${index}`} />
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-10 text-center">
                        <p className="text-sm font-semibold text-foreground">
                            {error ? "Could not load saved posts" : "No saved posts yet"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {error ?? "Save posts from your feed to find them here later."}
                        </p>
                        {error && (
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={handleRetryInitialLoad}
                            >
                                Try again
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onPostUpdate={handlePostUpdate}
                                onPostRemove={handlePostRemove}
                            />
                        ))}

                        {hasMore && (
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Load more
                            </Button>
                        )}
                    </div>
                )}
            </main>
            </div>
        </SocialErrorBoundary>
    );
}
