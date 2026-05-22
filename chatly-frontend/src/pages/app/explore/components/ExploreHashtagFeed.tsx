import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/features/social/components/PostCard";
import { PostCardSkeleton } from "@/pages/app/feed/components/PostCardSkeleton";
import type { Post, PostSearchSort } from "@/types/post";

interface ExploreHashtagFeedProps {
    hashtag: string;
    posts: Post[];
    sort: PostSearchSort;
    hasMore: boolean;
    isLoading: boolean;
    error: string | null;
    onBack: () => void;
    onLoadMore: () => void;
    onRetry: () => void;
    onSortChange: (sort: PostSearchSort) => void;
    onPostUpdate: (postId: string, updates: Partial<Post>) => void;
    onPostRemove: (postId: string) => void;
}

const HASHTAG_SORT_OPTIONS: { label: string; value: PostSearchSort }[] = [
    { label: "Newest", value: "newest" },
    { label: "Oldest", value: "oldest" },
    { label: "Most interactions", value: "interactions" },
];

export function ExploreHashtagFeed({
    hashtag,
    posts,
    sort,
    hasMore,
    isLoading,
    error,
    onBack,
    onLoadMore,
    onRetry,
    onSortChange,
    onPostUpdate,
    onPostRemove,
}: ExploreHashtagFeedProps) {
    return (
        <section className="mx-auto w-full max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onBack}
                    className="h-10 rounded-xl px-3"
                >
                    <ArrowLeft className="mr-2 size-4" />
                    Back to feed
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                    {HASHTAG_SORT_OPTIONS.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={sort === option.value ? "default" : "outline"}
                            onClick={() => onSortChange(option.value)}
                            className="h-9 rounded-xl"
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                    Hashtag results
                </p>
                <h1 className="mt-1 text-2xl font-bold text-foreground">
                    #{hashtag}
                </h1>
            </div>

            {isLoading && posts.length === 0 ? (
                <div className="flex flex-col gap-4">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                </div>
            ) : error && posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-foreground">
                        Could not load hashtag posts
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onRetry}
                        className="mt-4 rounded-xl"
                    >
                        Try again
                    </Button>
                </div>
            ) : posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-foreground">
                        No posts found for #{hashtag}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Try another hashtag from trending topics.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {posts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onPostUpdate={onPostUpdate}
                            onPostRemove={onPostRemove}
                        />
                    ))}
                </div>
            )}

            {hasMore && posts.length > 0 && (
                <div className="mt-6 flex justify-center">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isLoading}
                        onClick={onLoadMore}
                        className="rounded-xl px-8"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            "Load more"
                        )}
                    </Button>
                </div>
            )}
        </section>
    );
}
