import { Search, Filter, Play, Copy } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postService } from "@/services/post.service";
import type { Post, FeedResponse, PostPage } from "@/types/post";
import { toast } from "sonner";
import { AxiosError } from "axios";

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
    const [selectedCategory, setSelectedCategory] = useState("For You");
    const [searchInput, setSearchInput] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [exploreCursor, setExploreCursor] = useState<string | null>(null);
    const [hasMoreExplore, setHasMoreExplore] = useState(true);
    const [searchPage, setSearchPage] = useState(0);
    const [hasMoreSearch, setHasMoreSearch] = useState(true);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isSearchActive = debouncedQuery.trim().length > 0;
    const activeHashtag = CATEGORIES.find((c) => c.label === selectedCategory)?.hashtag ?? null;
    const isHashtagActive = !isSearchActive && activeHashtag !== null;

    const loadExploreFeed = useCallback(async (cursor: string | null, append: boolean) => {
        setIsLoading(true);
        try {
            const res = await postService.getExploreFeed(cursor);
            if (res.code !== 1000) {
                toast.error(res.message ?? "Failed to load explore feed");
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
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadSearchResults = useCallback(
        async (q: string | null, hashtag: string | null, page: number, append: boolean) => {
            setIsLoading(true);
            try {
                const res = await postService.searchPosts(q, hashtag, page);
                if (res.code !== 1000) {
                    toast.error(res.message ?? "Search failed");
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
                toast.error(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(searchInput), DEBOUNCE_MS);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput]);

    useEffect(() => {
        setPosts([]);
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
    }, [debouncedQuery, selectedCategory]);

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
        <div className="w-full h-full bg-background overflow-y-auto px-6 py-6 hide-scrollbar">
            <div className="max-w-5xl mx-auto mb-8 flex items-center gap-4">
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

            <div className="max-w-5xl mx-auto mb-8 flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
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
                        onClick={() => setSelectedCategory(cat.label)}
                    >
                        {cat.label}
                    </Badge>
                ))}
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                {isLoading && posts.length === 0 ? (
                    <ExploreSkeletons />
                ) : posts.length === 0 ? (
                    <p className="col-span-3 text-center text-muted-foreground py-16">
                        No posts found.
                    </p>
                ) : (
                    posts.map((post) => <ExploreCard key={post.id} post={post} />)
                )}
            </div>

            {hasMore && posts.length > 0 && (
                <div className="max-w-5xl mx-auto mt-8 flex justify-center">
                    <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        className="rounded-2xl px-8"
                    >
                        {isLoading ? "Loading..." : "Load more"}
                    </Button>
                </div>
            )}
        </div>
    );
}

function ExploreCard({ post }: { post: Post }) {
    const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
    const isAlbum = post.mediaUrls && post.mediaUrls.length > 1;

    return (
        <div className="relative aspect-square rounded-3xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 bg-muted">
            {hasMedia ? (
                <img
                    src={post.mediaUrls[0]}
                    alt="Post media"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center p-4 text-sm text-muted-foreground line-clamp-5">
                    {post.content}
                </div>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

            {isAlbum && (
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-full p-1.5">
                    <Copy className="w-4 h-4 text-white" />
                </div>
            )}
            {post.hashtags?.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">
                        {post.hashtags.map((h) => `#${h}`).join(" ")}
                    </p>
                </div>
            )}
            <Play className="hidden" />
        </div>
    );
}

function ExploreSkeletons() {
    return (
        <>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-3xl bg-muted animate-pulse" />
            ))}
        </>
    );
}
