import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Local-first store for conversation user-preferences.
 * These are stored in localStorage so they survive page refresh.
 * Will be synced to backend once the APIs are ready.
 */

export type ConversationCategory =
    | "customer"
    | "family"
    | "work"
    | "friends"
    | "reply-later"
    | "colleagues";

export const CATEGORY_META: Record<
    ConversationCategory,
    { label: string; color: string }
> = {
    "customer":   { label: "Customer",    color: "#ef4444" },
    "family":     { label: "Family",      color: "#ec4899" },
    "work":       { label: "Work",        color: "#f97316" },
    "friends":    { label: "Friends",     color: "#eab308" },
    "reply-later":{ label: "Reply later", color: "#22c55e" },
    "colleagues": { label: "Colleagues",  color: "#3b82f6" },
};

interface ConvPrefs {
    isPinned?: boolean;
    isMuted?: boolean;
    mutedUntil?: string | null; // ISO datetime string, null = forever
    nickname?: string | null;
    categories?: ConversationCategory[];
}

interface ConversationPrefsState {
    /** Map of conversationId → prefs */
    prefs: Record<string, ConvPrefs>;
    setPin: (conversationId: string, pinned: boolean) => void;
    setMute: (conversationId: string, muted: boolean, mutedUntil?: string | null) => void;
    setNickname: (conversationId: string, nickname: string | null) => void;
    setCategory: (conversationId: string, category: ConversationCategory, selected: boolean) => void;
    getPrefs: (conversationId: string) => ConvPrefs;
}

export const useConversationPrefsStore = create<ConversationPrefsState>()(
    persist(
        (set, get) => ({
            prefs: {},

            setPin: (conversationId, pinned) => {
                set((state) => ({
                    prefs: {
                        ...state.prefs,
                        [conversationId]: {
                            ...state.prefs[conversationId],
                            isPinned: pinned,
                        },
                    },
                }));
            },

            setMute: (conversationId, muted, mutedUntil) => {
                set((state) => ({
                    prefs: {
                        ...state.prefs,
                        [conversationId]: {
                            ...state.prefs[conversationId],
                            isMuted: muted,
                            mutedUntil: muted ? (mutedUntil ?? null) : null,
                        },
                    },
                }));
            },

            setNickname: (conversationId, nickname) => {
                set((state) => ({
                    prefs: {
                        ...state.prefs,
                        [conversationId]: {
                            ...state.prefs[conversationId],
                            nickname,
                        },
                    },
                }));
            },

            setCategory: (conversationId, category, selected) => {
                set((state) => ({
                    prefs: {
                        ...state.prefs,
                        [conversationId]: {
                            ...state.prefs[conversationId],
                            // Single-select: set the one category, or clear if deselected
                            categories: selected ? [category] : [],
                        },
                    },
                }));
            },

            getPrefs: (conversationId) => {
                return get().prefs[conversationId] ?? {};
            },
        }),
        {
            name: "chatly-conversation-prefs",
        },
    ),
);
