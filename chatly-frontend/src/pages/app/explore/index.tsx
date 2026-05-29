import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { postService } from "@/services/post.service";
import type {
    Post,
    FeedResponse,
    PostPage,
    PostSearchSort,
} from "@/types/post";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { SocialErrorBoundary } from "@/features/social/components/SocialErrorBoundary";
import { ExploreResultsGrid } from "@/pages/app/explore/components/ExploreResultsGrid";
import { ExploreTrendingSidebar } from "@/pages/app/explore/components/ExploreTrendingSidebar";
import { ExploreCard } from "@/pages/app/explore/components/ExploreCard";
import { ExploreHashtagFeed } from "@/pages/app/explore/components/ExploreHashtagFeed";
import { ExploreToolbar } from "@/pages/app/explore/components/ExploreToolbar";
import { DEFAULT_EXPLORE_CATEGORY_ID, EXPLORE_CATEGORIES } from "@/constants/explore";

const DEBOUNCE_MS = 400;

function parseHashtagQuery(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed.startsWith("#")) {
        return null;
    }
    const normalized = trimmed.replace(/^#/, "").toLowerCase();
    return /^[a-z0-9_]+$/i.test(normalized) ? normalized : null;
}

export default function ExplorePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
        DEFAULT_EXPLORE_CATEGORY_ID,
    );
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
    const [hashtagSort, setHashtagSort] = useState<PostSearchSort>("newest");

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hashtagFromSearch = parseHashtagQuery(debouncedQuery);
    const isSearchActive =
        debouncedQuery.trim().length > 0 && hashtagFromSearch === null;
    const activeHashtag = isSearchActive
        ? null
        : (hashtagFromSearch ?? selectedHashtag);
    const isHashtagActive = activeHashtag !== null;

    useEffect(() => {
        const hashtagFromParams = searchParams.get("hashtag");
        const normalized = hashtagFromParams
            ? hashtagFromParams.replace(/^#/, "").trim().toLowerCase()
            : null;

        setSelectedHashtag(normalized);

        if (normalized) {
            setSearchInput(`#${normalized}`);
            const matchedCategory = EXPLORE_CATEGORIES.find(
                (category) => category.hashtag === normalized,
            );
            setSelectedCategoryId(matchedCategory?.id ?? DEFAULT_EXPLORE_CATEGORY_ID);
            return;
        }

        setSelectedCategoryId(DEFAULT_EXPLORE_CATEGORY_ID);
        setSearchInput((current) => (current.startsWith("#") ? "" : current));
    }, [searchParams]);

    const loadExploreFeed = useCallback(async (cursor: string | null, append: boolean) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await postService.getExploreFeed(cursor);
            if (res.code !== 1000) {
                const message = res.message ?? t("explore.load_failed");
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
                    ? (error.response?.data?.message ?? t("explore.load_failed"))
                    : t("explore.unexpected_error");
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    const loadSearchResults = useCallback(
        async (
            q: string | null,
            hashtag: string | null,
            page: number,
            append: boolean,
            sort: PostSearchSort,
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await postService.searchPosts(
                    q,
                    hashtag,
                    page,
                    undefined,
                    sort,
                );
                if (res.code !== 1000) {
                    const message = res.message ?? t("explore.search_failed");
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
                        ? (error.response?.data?.message ?? t("explore.search_failed"))
                        : t("explore.unexpected_error");
                setError(msg);
                toast.error(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [t],
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
            loadSearchResults(debouncedQuery, null, 0, false, "newest");
        } else if (isHashtagActive) {
            loadSearchResults(null, activeHashtag, 0, false, hashtagSort);
        } else {
            loadExploreFeed(null, false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQuery, selectedHashtag, hashtagSort]);

    const updateHashtagFilter = (hashtag: string | null) => {
        if (hashtag) {
            setSearchParams({ hashtag }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    };

    const handleCategoryClick = (categoryId: string, hashtag: string | null) => {
        setSelectedCategoryId(categoryId);
        setSelectedHashtag(hashtag);
        setSearchInput(hashtag ? `#${hashtag}` : "");
        setHashtagSort("newest");
        updateHashtagFilter(hashtag);
    };

    const handleTrendingHashtagClick = (hashtag: string) => {
        setSearchInput(`#${hashtag}`);
        setDebouncedQuery("");
        setSelectedCategoryId(DEFAULT_EXPLORE_CATEGORY_ID);
        setSelectedHashtag(hashtag);
        setHashtagSort("newest");
        updateHashtagFilter(hashtag);
    };

    const handleRetry = () => {
        if (isSearchActive) {
            loadSearchResults(debouncedQuery, null, 0, false, "newest");
        } else if (isHashtagActive) {
            loadSearchResults(null, activeHashtag, 0, false, hashtagSort);
        } else {
            loadExploreFeed(null, false);
        }
    };

    const handleLoadMore = () => {
        if (isSearchActive) {
            const nextPage = searchPage + 1;
            setSearchPage(nextPage);
            loadSearchResults(debouncedQuery, null, nextPage, true, "newest");
        } else if (isHashtagActive) {
            const nextPage = searchPage + 1;
            setSearchPage(nextPage);
            loadSearchResults(null, activeHashtag, nextPage, true, hashtagSort);
        } else {
            loadExploreFeed(exploreCursor, true);
        }
    };

    const hasMore = isSearchActive || isHashtagActive ? hasMoreSearch : hasMoreExplore;
    const openPostDetail = (postId: string) => {
        navigate(`/post/${postId}`, {
            state: {
                source: "explore",
                sourcePath: `${location.pathname}${location.search}`,
            },
        });
    };

    const handlePostUpdate = (postId: string, updates: Partial<Post>) => {
        setPosts((current) =>
            current.map((post) =>
                post.id === postId ? { ...post, ...updates } : post,
            ),
        );
    };

    const handlePostRemove = (postId: string) => {
        setPosts((current) => current.filter((post) => post.id !== postId));
    };

    return (
        <SocialErrorBoundary
            title={t("explore.page_unavailable_title")}
            message={t("explore.page_unavailable_message")}
        >
            <div className="h-full w-full overflow-y-auto bg-background px-6 py-6 hide-scrollbar">
                <ExploreToolbar
                    searchInput={searchInput}
                    selectedCategoryId={selectedCategoryId}
                    selectedHashtag={selectedHashtag}
                    onSearchChange={setSearchInput}
                    onCategoryClick={handleCategoryClick}
                />

                {isHashtagActive && activeHashtag ? (
                    <ExploreHashtagFeed
                        hashtag={activeHashtag}
                        posts={posts}
                        sort={hashtagSort}
                        hasMore={hasMore}
                        isLoading={isLoading}
                        error={error}
                        onBack={() => navigate("/home")}
                        onLoadMore={handleLoadMore}
                        onRetry={handleRetry}
                        onSortChange={setHashtagSort}
                        onPostUpdate={handlePostUpdate}
                        onPostRemove={handlePostRemove}
                    />
                ) : (
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
                        renderCard={(post) => (
                            <ExploreCard
                                key={post.id}
                                post={post}
                                onClick={() => openPostDetail(post.id)}
                            />
                        )}
                    />

                    <ExploreTrendingSidebar
                        hashtags={trendingHashtags}
                        loading={trendingLoading}
                        selectedHashtag={selectedHashtag}
                        onSelect={handleTrendingHashtagClick}
                    />
                </div>
                )}
            </div>
        </SocialErrorBoundary>
    );
}

