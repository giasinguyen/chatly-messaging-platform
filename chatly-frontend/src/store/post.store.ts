import { create } from "zustand";
import type { Post } from "@/types/post";

interface PostState {
    feed: Post[];
    hasMore: boolean;
    page: number;
    loadingFeed: boolean;

    prependPost: (post: Post) => void;
    setFeed: (posts: Post[], hasMore: boolean) => void;
    appendFeed: (posts: Post[], hasMore: boolean) => void;
    updatePost: (postId: string, updates: Partial<Post>) => void;
    removePost: (postId: string) => void;
    nextPage: () => void;
    resetFeed: () => void;
    setLoadingFeed: (loading: boolean) => void;
}

export const usePostStore = create<PostState>((set) => ({
    feed: [],
    hasMore: true,
    page: 0,
    loadingFeed: false,

    prependPost: (post) =>
        set((state) => ({ feed: [post, ...state.feed] })),

    setFeed: (posts, hasMore) =>
        set({ feed: posts, hasMore, page: 0 }),

    appendFeed: (posts, hasMore) =>
        set((state) => {
            const existingIds = new Set(state.feed.map((p) => p.id));
            const newPosts = posts.filter((p) => !existingIds.has(p.id));
            return { feed: [...state.feed, ...newPosts], hasMore };
        }),

    updatePost: (postId, updates) =>
        set((state) => ({
            feed: state.feed.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
        })),

    removePost: (postId) =>
        set((state) => ({ feed: state.feed.filter((p) => p.id !== postId) })),

    nextPage: () =>
        set((state) => ({ page: state.page + 1 })),

    resetFeed: () =>
        set({ feed: [], hasMore: true, page: 0 }),

    setLoadingFeed: (loading) =>
        set({ loadingFeed: loading }),
}));
