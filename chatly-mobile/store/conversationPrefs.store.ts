import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'chatly-conv-prefs';

interface ConvPrefs {
  isPinned?: boolean;
  isMuted?: boolean;
  muteUntil?: number | null; // ms timestamp, null = permanent
  nickname?: string;
}

/** Returns true if the conversation is currently muted (respects timed mute expiry) */
export function isConvMuted(prefs: ConvPrefs): boolean {
  if (!prefs.isMuted) return false;
  if (prefs.muteUntil == null) return true;
  return Date.now() < prefs.muteUntil;
}

interface ConversationPrefsState {
  prefs: Record<string, ConvPrefs>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPin: (conversationId: string, pinned: boolean) => Promise<void>;
  setMute: (conversationId: string, muted: boolean, muteUntil?: number | null) => Promise<void>;
  setNickname: (conversationId: string, nickname: string) => Promise<void>;
  getPrefs: (conversationId: string) => ConvPrefs;
}

export const useConversationPrefsStore = create<ConversationPrefsState>((set, get) => ({
  prefs: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ prefs: JSON.parse(raw), hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  setPin: async (conversationId, pinned) => {
    const next = {
      ...get().prefs,
      [conversationId]: { ...get().prefs[conversationId], isPinned: pinned },
    };
    set({ prefs: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  setMute: async (conversationId, muted, muteUntil) => {
    const next = {
      ...get().prefs,
      [conversationId]: {
        ...get().prefs[conversationId],
        isMuted: muted,
        muteUntil: muted ? (muteUntil !== undefined ? muteUntil : null) : undefined,
      },
    };
    set({ prefs: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  setNickname: async (conversationId, nickname) => {
    const next = {
      ...get().prefs,
      [conversationId]: { ...get().prefs[conversationId], nickname },
    };
    set({ prefs: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  getPrefs: (conversationId) => {
    return get().prefs[conversationId] ?? {};
  },
}));
