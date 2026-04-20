import { useCallback, useEffect, useRef, type RefObject } from "react";

interface UseMessageListScrollOptions {
    messageCount: number;
    isLoadingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    highlightedMessageId?: string | null;
}

interface UseMessageListScrollResult {
    containerRef: RefObject<HTMLDivElement>;
    sentinelRef: RefObject<HTMLDivElement>;
    scrollEndRef: RefObject<HTMLDivElement>;
}

const HIGHLIGHT_CLASS = "search-highlight";
const HIGHLIGHT_DURATION_MS = 2000;

export function useMessageListScroll({
    messageCount,
    isLoadingMore,
    hasMore,
    onLoadMore,
    highlightedMessageId,
}: UseMessageListScrollOptions): UseMessageListScrollResult {
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const isFirstMount = useRef(true);

    useEffect(() => {
        if (isFirstMount.current) {
            scrollEndRef.current?.scrollIntoView({ behavior: "instant" });
            isFirstMount.current = false;
        } else {
            scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messageCount]);

    useEffect(() => {
        if (
            !isLoadingMore &&
            containerRef.current &&
            prevScrollHeightRef.current > 0
        ) {
            const newScrollHeight = containerRef.current.scrollHeight;
            containerRef.current.scrollTop =
                newScrollHeight - prevScrollHeightRef.current;
            prevScrollHeightRef.current = 0;
        }
    }, [isLoadingMore, messageCount]);

    useEffect(() => {
        if (!highlightedMessageId || !containerRef.current) return;
        const el = containerRef.current.querySelector(
            `[data-message-id="${highlightedMessageId}"]`,
        );
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add(HIGHLIGHT_CLASS);
            const timer = setTimeout(
                () => el.classList.remove(HIGHLIGHT_CLASS),
                HIGHLIGHT_DURATION_MS,
            );
            return () => clearTimeout(timer);
        }
    }, [highlightedMessageId]);

    const handleSentinelIntersect = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const entry = entries[0];
            if (entry.isIntersecting && hasMore && !isLoadingMore) {
                if (containerRef.current) {
                    prevScrollHeightRef.current = containerRef.current.scrollHeight;
                }
                onLoadMore();
            }
        },
        [hasMore, isLoadingMore, onLoadMore],
    );

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(handleSentinelIntersect, {
            root: containerRef.current,
            threshold: 0.1,
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [handleSentinelIntersect]);

    return { containerRef, sentinelRef, scrollEndRef };
}
