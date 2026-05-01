import { create } from "zustand";
import { postService } from "@/services/post.service";
import { HOME_FEED_PAGE_SIZE } from "@/constants/feed";
import { SAMPLE_FEED_POSTS } from "@/constants/feedSamples";
import type { FeedResponse, Post } from "@/types/post";

interface FeedState {
    posts: Post[];
    nextCursor: string | null;
    hasMore: boolean;
    pendingNewPosts: Post[];
    isLoading: boolean;
    isLoadingMore: boolean;

    loadInitialFeed: () => Promise<void>;
    loadMore: (cursor?: string | null) => Promise<void>;
    flushPendingPosts: () => void;
    addPendingPost: (post: Post) => void;
    updatePost: (postId: string, updates: Partial<Post>) => void;
    removePost: (postId: string) => void;
}

function mergeFeedItems(existing: Post[], incoming: Post[]): Post[] {
    if (incoming.length === 0) return existing;
    const existingIds = new Set(existing.map((post) => post.id));
    const uniqueIncoming = incoming.filter((post) => !existingIds.has(post.id));
    return [...existing, ...uniqueIncoming];
}

function prependPendingPosts(posts: Post[], pending: Post[]): Post[] {
    if (pending.length === 0) return posts;
    const existingIds = new Set(posts.map((post) => post.id));
    const uniquePending = pending.filter((post) => !existingIds.has(post.id));
    return [...uniquePending, ...posts];
}

function applyFeedResponse(
    response: FeedResponse,
    currentPosts: Post[],
): { posts: Post[]; nextCursor: string | null; hasMore: boolean } {
    return {
        posts: mergeFeedItems(currentPosts, response.items),
        nextCursor: response.nextCursor,
        hasMore: response.hasMore,
    };
}

export const useFeedStore = create<FeedState>((set, get) => ({
    posts: [],
    nextCursor: null,
    hasMore: true,
    pendingNewPosts: [],
    isLoading: false,
    isLoadingMore: false,

    loadInitialFeed: async () => {
        if (get().isLoading) return;
        set({
            isLoading: true,
            isLoadingMore: false,
            posts: [],
            nextCursor: null,
            hasMore: true,
            pendingNewPosts: [],
        });
        try {
            const res = await postService.getHomeFeed(null, HOME_FEED_PAGE_SIZE);
            if (res.code === 1000 && res.result) {
                if (res.result.items.length === 0) {
                    set({
                        posts: SAMPLE_FEED_POSTS,
                        nextCursor: null,
                        hasMore: false,
                    });
                } else {
                    set({
                        posts: res.result.items,
                        nextCursor: res.result.nextCursor,
                        hasMore: res.result.hasMore,
                    });
                }
            }
        } catch (_error: unknown) {
            set({
                posts: SAMPLE_FEED_POSTS,
                nextCursor: null,
                hasMore: false,
            });
        } finally {
            set({ isLoading: false });
        }
    },

    loadMore: async (cursor) => {
        const { isLoadingMore, isLoading, hasMore, nextCursor } = get();
        const effectiveCursor = cursor ?? nextCursor;
        if (isLoadingMore || isLoading || !hasMore || !effectiveCursor) return;

        set({ isLoadingMore: true });
        try {
            const res = await postService.getHomeFeed(
                effectiveCursor,
                HOME_FEED_PAGE_SIZE,
            );
            if (res.code === 1000 && res.result) {
                set((state) => applyFeedResponse(res.result, state.posts));
            }
        } finally {
            set({ isLoadingMore: false });
        }
    },

    flushPendingPosts: () => {
        set((state) => ({
            posts: prependPendingPosts(state.posts, state.pendingNewPosts),
            pendingNewPosts: [],
        }));
    },

    addPendingPost: (post) => {
        set((state) => {
            if (
                state.pendingNewPosts.some((p) => p.id === post.id) ||
                state.posts.some((p) => p.id === post.id)
            ) {
                return state;
            }
            return { pendingNewPosts: [post, ...state.pendingNewPosts] };
        });
    },

    updatePost: (postId, updates) => {
        set((state) => ({
            posts: state.posts.map((post) =>
                post.id === postId ? { ...post, ...updates } : post,
            ),
        }));
    },

    removePost: (postId) => {
        set((state) => ({
            posts: state.posts.filter((post) => post.id !== postId),
        }));
    },
}));
