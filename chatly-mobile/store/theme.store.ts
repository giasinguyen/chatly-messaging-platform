import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const THEME_STORAGE_KEY = 'chatly-theme-mode';

interface ThemeState {
  isDarkMode: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setDarkMode: (enabled: boolean) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false,
  hydrated: false,

  hydrate: async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      set({ isDarkMode: storedTheme === 'dark', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setDarkMode: async (enabled) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');
    set({ isDarkMode: enabled });
  },
}));
