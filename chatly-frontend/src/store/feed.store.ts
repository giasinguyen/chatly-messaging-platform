import { create } from "zustand";
import { postService } from "@/services/post.service";
import { HOME_FEED_PAGE_SIZE } from "@/constants/feed";
import type { FeedResponse, Post } from "@/types/post";

const FEED_LOAD_ERROR_MESSAGE = "Could not load feed.";

interface FeedState {
    posts: Post[];
    nextCursor: string | null;
    hasMore: boolean;
    pendingNewPosts: Post[];
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;

    loadInitialFeed: () => Promise<void>;
    loadMore: (cursor?: string | null) => Promise<void>;
    flushPendingPosts: () => void;
    addPendingPost: (post: Post) => void;
    addNewPost: (post: Post) => void;
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

function getFeedErrorMessage(error: unknown): string {
    return error instanceof Error && error.message
        ? error.message
        : FEED_LOAD_ERROR_MESSAGE;
}

export const useFeedStore = create<FeedState>((set, get) => ({
    posts: [],
    nextCursor: null,
    hasMore: true,
    pendingNewPosts: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,

    loadInitialFeed: async () => {
        if (get().isLoading) return;
        set({
            isLoading: true,
            isLoadingMore: false,
            posts: [],
            nextCursor: null,
            hasMore: true,
            pendingNewPosts: [],
            error: null,
        });
        try {
            const res = await postService.getHomeFeed(
                null,
                HOME_FEED_PAGE_SIZE,
            );
            if (res.code !== 1000 || !res.result) {
                set({
                    posts: [],
                    nextCursor: null,
                    hasMore: false,
                    error: res.message ?? FEED_LOAD_ERROR_MESSAGE,
                });
                return;
            }

            set({
                posts: res.result.items,
                nextCursor: res.result.nextCursor,
                hasMore: res.result.hasMore,
                error: null,
            });
        } catch (error: unknown) {
            set({
                posts: [],
                nextCursor: null,
                hasMore: false,
                error: getFeedErrorMessage(error),
            });
        } finally {
            set({ isLoading: false });
        }
    },

    loadMore: async (cursor) => {
        const { isLoadingMore, isLoading, hasMore, nextCursor } = get();
        const effectiveCursor = cursor ?? nextCursor;
        if (isLoadingMore || isLoading || !hasMore || !effectiveCursor) return;

        set({ isLoadingMore: true, error: null });
        try {
            const res = await postService.getHomeFeed(
                effectiveCursor,
                HOME_FEED_PAGE_SIZE,
            );
            if (res.code === 1000 && res.result) {
                set((state) => applyFeedResponse(res.result, state.posts));
            } else {
                set({ error: res.message ?? FEED_LOAD_ERROR_MESSAGE });
            }
        } catch (error: unknown) {
            set({ error: getFeedErrorMessage(error) });
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

    addNewPost: (post) => {
        set((state) => {
            if (state.posts.some((p) => p.id === post.id)) {
                return state;
            }
            return {
                posts: [post, ...state.posts],
                pendingNewPosts: state.pendingNewPosts.filter(
                    (p) => p.id !== post.id,
                ),
            };
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
