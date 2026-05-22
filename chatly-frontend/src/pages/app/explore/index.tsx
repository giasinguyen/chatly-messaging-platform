import { Search, Filter } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postService } from "@/services/post.service";
import type { Post, FeedResponse, PostPage } from "@/types/post";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { SocialErrorBoundary } from "@/features/social/components/SocialErrorBoundary";
import { ExploreResultsGrid } from "@/pages/app/explore/components/ExploreResultsGrid";
import { ExploreTrendingSidebar } from "@/pages/app/explore/components/ExploreTrendingSidebar";
import { ExploreCard } from "@/pages/app/explore/components/ExploreCard";

const CATEGORIES = [
    { label: "For You", hashtag: null },
    { label: "Trending", hashtag: "trending" },
    { label: "Photography", hashtag: "photography" },
    { label: "Digital Art", hashtag: "digitalart" },
    { label: "Travel", hashtag: "travel" },
    { label: "Architecture", hashtag: "architecture" },
];

const DEBOUNCE_MS = 400;

export default function ExplorePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState("For You");
    const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [exploreCursor, setExploreCursor] = useState<string | null>(null);
    const [hasMoreExplore, setHasMoreExplore] = useState(true);
    const [searchPage, setSearchPage] = useState(0);
    const [hasMoreSearch, setHasMoreSearch] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trendingHashtags, setTrendingHashtags] = useState<string[]>([]);
    const [trendingLoading, setTrendingLoading] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isSearchActive = debouncedQuery.trim().length > 0;
    const activeHashtag = !isSearchActive ? selectedHashtag : null;
    const isHashtagActive = !isSearchActive && activeHashtag !== null;

    useEffect(() => {
        const hashtagFromParams = searchParams.get("hashtag");
        const normalized = hashtagFromParams
            ? hashtagFromParams.replace(/^#/, "").trim().toLowerCase()
            : null;

        setSelectedHashtag(normalized);

        if (normalized) {
            const matchedCategory = CATEGORIES.find(
                (category) => category.hashtag === normalized,
            );
            setSelectedCategory(matchedCategory?.label ?? "For You");
            return;
        }

        setSelectedCategory("For You");
    }, [searchParams]);

    const loadExploreFeed = useCallback(async (cursor: string | null, append: boolean) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await postService.getExploreFeed(cursor);
            if (res.code !== 1000) {
                const message = res.message ?? "Failed to load explore feed";
                setError(message);
                toast.error(message);
                return;
            }
            const data = res.result as FeedResponse;
            setPosts((prev) => (append ? [...prev, ...data.items] : data.items));
            setExploreCursor(data.nextCursor);
            setHasMoreExplore(data.hasMore);
        } catch (error: unknown) {
            const msg =
                error instanceof AxiosError
                    ? (error.response?.data?.message ?? "Failed to load explore feed")
                    : "An unexpected error occurred";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadSearchResults = useCallback(
        async (q: string | null, hashtag: string | null, page: number, append: boolean) => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await postService.searchPosts(q, hashtag, page);
                if (res.code !== 1000) {
                    const message = res.message ?? "Search failed";
                    setError(message);
                    toast.error(message);
                    return;
                }
                const data = res.result as PostPage;
                setPosts((prev) => (append ? [...prev, ...data.content] : data.content));
                setHasMoreSearch(!data.last);
            } catch (error: unknown) {
                const msg =
                    error instanceof AxiosError
                        ? (error.response?.data?.message ?? "Search failed")
                        : "An unexpected error occurred";
                setError(msg);
                toast.error(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    const loadTrendingHashtags = useCallback(async () => {
        setTrendingLoading(true);
        try {
            const response = await postService.getTrendingHashtags(12);
            if (response.code !== 1000 || !response.result) {
                setTrendingHashtags([]);
                return;
            }
            setTrendingHashtags(response.result.map((trend) => trend.hashtag));
        } catch {
            setTrendingHashtags([]);
        } finally {
            setTrendingLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTrendingHashtags();
    }, [loadTrendingHashtags]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(searchInput), DEBOUNCE_MS);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput]);

    useEffect(() => {
        setPosts([]);
        setError(null);
        setSearchPage(0);
        setExploreCursor(null);
        setHasMoreExplore(true);
        setHasMoreSearch(true);

        if (isSearchActive) {
            loadSearchResults(debouncedQuery, null, 0, false);
        } else if (isHashtagActive) {
            loadSearchResults(null, activeHashtag, 0, false);
        } else {
            loadExploreFeed(null, false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQuery, selectedHashtag]);

    const updateHashtagFilter = (hashtag: string | null) => {
        if (hashtag) {
            setSearchParams({ hashtag }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    };

    const handleCategoryClick = (label: string, hashtag: string | null) => {
        setSelectedCategory(label);
        setSelectedHashtag(hashtag);
        updateHashtagFilter(hashtag);
    };

    const handleTrendingHashtagClick = (hashtag: string) => {
        setSearchInput("");
        setDebouncedQuery("");
        setSelectedCategory("For You");
        setSelectedHashtag(hashtag);
        updateHashtagFilter(hashtag);
    };

    const handleRetry = () => {
        if (isSearchActive) {
            loadSearchResults(debouncedQuery, null, 0, false);
        } else if (isHashtagActive) {
            loadSearchResults(null, activeHashtag, 0, false);
        } else {
            loadExploreFeed(null, false);
        }
    };

    const handleLoadMore = () => {
        if (isSearchActive) {
            const nextPage = searchPage + 1;
            setSearchPage(nextPage);
            loadSearchResults(debouncedQuery, null, nextPage, true);
        } else if (isHashtagActive) {
            const nextPage = searchPage + 1;
            setSearchPage(nextPage);
            loadSearchResults(null, activeHashtag, nextPage, true);
        } else {
            loadExploreFeed(exploreCursor, true);
        }
    };

    const hasMore = isSearchActive || isHashtagActive ? hasMoreSearch : hasMoreExplore;

    return (
        <SocialErrorBoundary
            title="Explore is unavailable"
            message="The explore page failed to render. Try again."
        >
            <div className="h-full w-full overflow-y-auto bg-background px-6 py-6 hide-scrollbar">
                <div className="mx-auto mb-8 flex max-w-6xl items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search explore..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-10 h-12 bg-muted/50 border-none rounded-2xl text-base focus-visible:ring-1 focus-visible:ring-brand"
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-2xl border-none bg-muted/50"
                >
                    <Filter className="w-5 h-5 text-muted-foreground" />
                </Button>
            </div>

                <div className="mx-auto mb-8 flex max-w-6xl items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {CATEGORIES.map((cat) => (
                    <Badge
                        key={cat.label}
                        variant={selectedCategory === cat.label ? "default" : "secondary"}
                        className={cn(
                            "px-5 py-2 rounded-xl cursor-pointer text-sm font-medium transition-all whitespace-nowrap",
                            selectedCategory === cat.label
                                ? "bg-brand text-white shadow-md shadow-brand/20"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() => handleCategoryClick(cat.label, cat.hashtag)}
                    >
                        {cat.label}
                    </Badge>
                ))}
                    {selectedHashtag && !CATEGORIES.some((cat) => cat.hashtag === selectedHashtag) && (
                        <Badge
                            variant="default"
                            className="cursor-pointer rounded-xl bg-brand px-5 py-2 text-sm font-medium text-white"
                            onClick={() => handleCategoryClick("For You", selectedHashtag)}
                        >
                            #{selectedHashtag}
                        </Badge>
                    )}
            </div>

                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <ExploreResultsGrid
                        isLoading={isLoading}
                        error={error}
                        posts={posts}
                        isSearchActive={isSearchActive}
                        searchQuery={debouncedQuery}
                        isHashtagActive={isHashtagActive}
                        activeHashtag={activeHashtag}
                        hasMore={hasMore}
                        onLoadMore={handleLoadMore}
                        onRetry={handleRetry}
                        renderCard={(post) => <ExploreCard key={post.id} post={post} />}
                    />

                    <ExploreTrendingSidebar
                        hashtags={trendingHashtags}
                        loading={trendingLoading}
                        selectedHashtag={selectedHashtag}
                        onSelect={handleTrendingHashtagClick}
                    />
                </div>
            </div>
        </SocialErrorBoundary>
    );
}

