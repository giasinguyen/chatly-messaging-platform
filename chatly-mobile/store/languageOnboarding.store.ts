import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { LANGUAGE_STORAGE_KEY } from '@/lib/i18n';

const LANGUAGE_ONBOARDING_STORAGE_KEY = 'chatly-language-onboarding-complete';

interface LanguageOnboardingState {
  hydrated: boolean;
  completed: boolean;
  hydrate: () => Promise<void>;
  complete: () => Promise<void>;
}

export const useLanguageOnboardingStore = create<LanguageOnboardingState>((set) => ({
  hydrated: false,
  completed: false,
  hydrate: async () => {
    const [stored, existingLanguage] = await AsyncStorage.multiGet([
      LANGUAGE_ONBOARDING_STORAGE_KEY,
      LANGUAGE_STORAGE_KEY,
    ]);
    set({ completed: stored[1] === 'true' || Boolean(existingLanguage[1]), hydrated: true });
  },
  complete: async () => {
    await AsyncStorage.setItem(LANGUAGE_ONBOARDING_STORAGE_KEY, 'true');
    set({ completed: true, hydrated: true });
  },
}));
