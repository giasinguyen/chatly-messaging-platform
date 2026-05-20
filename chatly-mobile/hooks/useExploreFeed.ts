import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EXPLORE_CATEGORIES,
  EXPLORE_FEED_PAGE_SIZE,
  EXPLORE_SEARCH_DEBOUNCE_MS,
  EXPLORE_SEARCH_PAGE_SIZE,
} from '@/constants/feed';
import { postService } from '@/services/post.service';
import type { Post } from '@/types/post';
import { getApiErrorMessage } from '@/utils/errorHandler';

type ExploreLoadMode = 'initial' | 'refresh' | 'append';

function mergeUniquePosts(existing: Post[], incoming: Post[]): Post[] {
  const existingIds = new Set(existing.map((post) => post.id));
  return [...existing, ...incoming.filter((post) => !existingIds.has(post.id))];
}

export function useExploreFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(EXPLORE_CATEGORIES[0].label);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [exploreCursor, setExploreCursor] = useState<string | null>(null);
  const [hasMoreExplore, setHasMoreExplore] = useState(true);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeHashtag = useMemo(
    () =>
      EXPLORE_CATEGORIES.find((category) => category.label === selectedCategory)?.hashtag ?? null,
    [selectedCategory]
  );
  const trimmedQuery = debouncedQuery.trim();
  const isSearchActive = trimmedQuery.length > 0;
  const isHashtagActive = !isSearchActive && activeHashtag !== null;
  const hasMore = isSearchActive || isHashtagActive ? hasMoreSearch : hasMoreExplore;

  const setLoadingForMode = (mode: ExploreLoadMode, value: boolean) => {
    if (mode === 'append') {
      setIsLoadingMore(value);
    } else if (mode === 'refresh') {
      setIsRefreshing(value);
    } else {
      setIsLoading(value);
    }
  };

  const loadExploreFeed = useCallback(async (cursor: string | null, mode: ExploreLoadMode) => {
    setLoadingForMode(mode, true);
    try {
      setErrorMessage(null);
      const response = await postService.getExploreFeed(cursor, EXPLORE_FEED_PAGE_SIZE);
      if (response.code !== 1000 || !response.result) {
        throw new Error(response.message ?? 'Could not load explore feed.');
      }
      setPosts((prev) =>
        mode === 'append' ? mergeUniquePosts(prev, response.result.items) : response.result.items
      );
      setExploreCursor(response.result.nextCursor);
      setHasMoreExplore(response.result.hasMore);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Could not load explore feed.'));
    } finally {
      setLoadingForMode(mode, false);
    }
  }, []);

  const loadSearchResults = useCallback(
    async (query: string | null, hashtag: string | null, page: number, mode: ExploreLoadMode) => {
      setLoadingForMode(mode, true);
      try {
        setErrorMessage(null);
        const response = await postService.searchPosts(
          query,
          hashtag,
          page,
          EXPLORE_SEARCH_PAGE_SIZE
        );
        if (response.code !== 1000 || !response.result) {
          throw new Error(response.message ?? 'Search failed.');
        }
        setPosts((prev) =>
          mode === 'append'
            ? mergeUniquePosts(prev, response.result.content)
            : response.result.content
        );
        setHasMoreSearch(!response.result.last);
        setSearchPage(page);
      } catch (error: unknown) {
        setErrorMessage(getApiErrorMessage(error, 'Search failed.'));
      } finally {
        setLoadingForMode(mode, false);
      }
    },
    []
  );

  const loadFirstPage = useCallback(
    async (mode: ExploreLoadMode) => {
      setExploreCursor(null);
      setHasMoreExplore(true);
      setSearchPage(0);
      setHasMoreSearch(true);

      if (isSearchActive) {
        await loadSearchResults(trimmedQuery, null, 0, mode);
      } else if (isHashtagActive) {
        await loadSearchResults(null, activeHashtag, 0, mode);
      } else {
        await loadExploreFeed(null, mode);
      }
    },
    [
      activeHashtag,
      isHashtagActive,
      isSearchActive,
      loadExploreFeed,
      loadSearchResults,
      trimmedQuery,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput), EXPLORE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void loadFirstPage('initial');
  }, [loadFirstPage]);

  const handleRefresh = useCallback(async () => {
    await loadFirstPage('refresh');
  }, [loadFirstPage]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) {
      return;
    }

    if (isSearchActive) {
      void loadSearchResults(trimmedQuery, null, searchPage + 1, 'append');
      return;
    }

    if (isHashtagActive) {
      void loadSearchResults(null, activeHashtag, searchPage + 1, 'append');
      return;
    }

    if (exploreCursor) {
      void loadExploreFeed(exploreCursor, 'append');
    }
  }, [
    activeHashtag,
    exploreCursor,
    hasMore,
    isHashtagActive,
    isLoading,
    isLoadingMore,
    isRefreshing,
    isSearchActive,
    loadExploreFeed,
    loadSearchResults,
    searchPage,
    trimmedQuery,
  ]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
  }, []);

  return {
    posts,
    selectedCategory,
    searchInput,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    errorMessage,
    setSelectedCategory,
    setSearchInput,
    handleClearSearch,
    handleRefresh,
    handleLoadMore,
  };
}
