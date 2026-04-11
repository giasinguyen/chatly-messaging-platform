import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Local-first store for conversation user-preferences.
 * These are stored in localStorage so they survive page refresh.
 * Will be synced to backend once the APIs are ready.
 */

export type ConversationCategory =
    | "khach-hang"
    | "gia-dinh"
    | "cong-viec"
    | "ban-be"
    | "tra-loi-sau"
    | "dong-nghiep";

export const CATEGORY_META: Record<
    ConversationCategory,
    { label: string; color: string }
> = {
    "khach-hang": { label: "Khách hàng", color: "#ef4444" },
    "gia-dinh":   { label: "Gia đình",   color: "#ec4899" },
    "cong-viec":  { label: "Công việc",  color: "#f97316" },
    "ban-be":     { label: "Bạn bè",     color: "#eab308" },
    "tra-loi-sau":{ label: "Trả lời sau",color: "#22c55e" },
    "dong-nghiep":{ label: "Đồng nghiệp",color: "#3b82f6" },
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
