import { create } from "zustand";

interface FollowState {
    followingSet: Set<string>;
    
    setFollowing: (userId: string, isFollowing: boolean) => void;
    isFollowing: (userId: string) => boolean;
    clearFollowing: () => void;
    addToFollowing: (userId: string) => void;
    removeFromFollowing: (userId: string) => void;
}

export const useFollowStore = create<FollowState>((set, get) => ({
    followingSet: new Set(),

    setFollowing: (userId, isFollowing) =>
        set((state) => {
            const newSet = new Set(state.followingSet);
            if (isFollowing) {
                newSet.add(userId);
            } else {
                newSet.delete(userId);
            }
            return { followingSet: newSet };
        }),

    isFollowing: (userId) => {
        return get().followingSet.has(userId);
    },

    clearFollowing: () =>
        set({ followingSet: new Set() }),

    addToFollowing: (userId) =>
        set((state) => {
            const newSet = new Set(state.followingSet);
            newSet.add(userId);
            return { followingSet: newSet };
        }),

    removeFromFollowing: (userId) =>
        set((state) => {
            const newSet = new Set(state.followingSet);
            newSet.delete(userId);
            return { followingSet: newSet };
        }),
}));
