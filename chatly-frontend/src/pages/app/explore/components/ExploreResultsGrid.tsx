import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Post } from "@/types/post";

interface ExploreResultsGridProps {
    isLoading: boolean;
    error: string | null;
    posts: Post[];
    isSearchActive: boolean;
    searchQuery: string;
    isHashtagActive: boolean;
    activeHashtag: string | null;
    hasMore: boolean;
    onLoadMore: () => void;
    onRetry: () => void;
    renderCard: (post: Post) => JSX.Element;
}

export function ExploreResultsGrid({
    isLoading,
    error,
    posts,
    isSearchActive,
    searchQuery,
    isHashtagActive,
    activeHashtag,
    hasMore,
    onLoadMore,
    onRetry,
    renderCard,
}: ExploreResultsGridProps) {
    const { t } = useTranslation();
    return (
        <div>
            {isLoading && posts.length === 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <ExploreSkeletons />
                </div>
            ) : error && posts.length === 0 ? (
                <div className="col-span-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-foreground">
                        {t("explore.load_failed_title")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={onRetry}>
                        {t("explore.try_again")}
                    </Button>
                </div>
            ) : posts.length === 0 ? (
                <div className="col-span-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-foreground">
                        {isSearchActive
                            ? t("explore.no_results_query", { query: searchQuery })
                            : isHashtagActive
                              ? t("explore.no_results_hashtag", { hashtag: activeHashtag })
                              : t("explore.no_posts")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isSearchActive
                            ? t("explore.no_results_query_hint")
                            : isHashtagActive
                              ? t("explore.no_results_hashtag_hint")
                              : t("explore.no_posts_hint")}
                    </p>
                </div>
            ) : (
                <div className="masonry-grid">
                    {posts.map((post) => (
                        <div key={post.id} className="masonry-item">
                            {renderCard(post)}
                        </div>
                    ))}
                </div>
            )}

            {hasMore && posts.length > 0 && (
                <div className="mt-8 flex justify-center">
                    <Button
                        variant="outline"
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="rounded-2xl px-8"
                    >
                        {isLoading ? t("explore.loading") : t("explore.load_more")}
                    </Button>
                </div>
            )}
        </div>
    );
}

function ExploreSkeletons() {
    return (
        <>
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-square rounded-3xl bg-muted animate-pulse" />
            ))}
        </>
    );
}
