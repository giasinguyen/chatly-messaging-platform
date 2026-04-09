import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Local-first store for conversation user-preferences.
 * These are stored in localStorage so they survive page refresh.
 * Will be synced to backend once the APIs are ready.
 */

interface ConvPrefs {
    isPinned?: boolean;
    isMuted?: boolean;
    mutedUntil?: string | null; // ISO datetime string, null = forever
    nickname?: string | null;
}

interface ConversationPrefsState {
    /** Map of conversationId → prefs */
    prefs: Record<string, ConvPrefs>;
    setPin: (conversationId: string, pinned: boolean) => void;
    setMute: (conversationId: string, muted: boolean, mutedUntil?: string | null) => void;
    setNickname: (conversationId: string, nickname: string | null) => void;
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

            getPrefs: (conversationId) => {
                return get().prefs[conversationId] ?? {};
            },
        }),
        {
            name: "chatly-conversation-prefs",
        },
    ),
);
