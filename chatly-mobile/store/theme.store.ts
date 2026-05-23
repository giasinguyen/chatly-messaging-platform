import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { applyThemeColors } from '@/constants/theme';

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
      const isDarkMode = storedTheme === 'dark';
      applyThemeColors(isDarkMode);
      set({ isDarkMode, hydrated: true });
    } catch {
      applyThemeColors(false);
      set({ hydrated: true });
    }
  },

  setDarkMode: async (enabled) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');
    applyThemeColors(enabled);
    set({ isDarkMode: enabled });
  },
}));
