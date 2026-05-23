import { useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
    hasMore: boolean;
    isLoading: boolean;
    rootMargin?: string;
    threshold?: number;
}

export function useInfiniteScroll(
    fetcher: (cursor: string | null) => void,
    cursor: string | null,
    options: UseInfiniteScrollOptions,
) {
    const { hasMore, isLoading, rootMargin = "0px", threshold = 0 } = options;

    const sentinelRef = useRef<HTMLDivElement>(null);
    const fetcherRef = useRef(fetcher);
    const cursorRef = useRef(cursor);
    const hasMoreRef = useRef(hasMore);
    const isLoadingRef = useRef(isLoading);

    useEffect(() => {
        fetcherRef.current = fetcher;
    }, [fetcher]);

    useEffect(() => {
        cursorRef.current = cursor;
    }, [cursor]);

    useEffect(() => {
        hasMoreRef.current = hasMore;
        isLoadingRef.current = isLoading;
    }, [hasMore, isLoading]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                if (!hasMoreRef.current || isLoadingRef.current) return;
                fetcherRef.current(cursorRef.current);
            },
            { rootMargin, threshold },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [rootMargin, threshold]);

    return { sentinelRef };
}
