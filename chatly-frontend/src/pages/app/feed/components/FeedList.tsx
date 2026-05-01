import type { RefObject } from "react";
import { Loader2 } from "lucide-react";
import { PostCard } from "@/features/social/components/PostCard";
import { HOME_FEED_INITIAL_SKELETONS } from "@/constants/feed";
import type { Post } from "@/types/post";
import { PostCardSkeleton } from "./PostCardSkeleton";

interface FeedListProps {
    posts: Post[];
    hasMore: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    sentinelRef: RefObject<HTMLDivElement | null>;
    onPostUpdate: (postId: string, updates: Partial<Post>) => void;
    onPostRemove: (postId: string) => void;
}

export function FeedList({
    posts,
    hasMore,
    isLoading,
    isLoadingMore,
    sentinelRef,
    onPostUpdate,
    onPostRemove,
}: FeedListProps) {
    if (isLoading && posts.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                {Array.from({ length: HOME_FEED_INITIAL_SKELETONS }).map((_, idx) => (
                    <PostCardSkeleton key={`feed-skeleton-${idx}`} />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    onPostUpdate={onPostUpdate}
                    onPostRemove={onPostRemove}
                />
            ))}

            <div ref={sentinelRef} className="h-1" aria-hidden />

            {isLoadingMore && (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                    You are all caught up.
                </p>
            )}
        </div>
    );
}
