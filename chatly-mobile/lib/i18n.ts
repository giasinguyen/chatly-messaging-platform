import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en.json';
import vi from '@/locales/vi.json';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Same key as web so language preference can align across clients. */
export const LANGUAGE_STORAGE_KEY = 'chatly-lang';

const initPromise = i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: 'vi',
  fallbackLng: 'vi',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function hydrateI18nLanguage(): Promise<void> {
  await initPromise;
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // Keep default language
  }
}

export async function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export function getAppLanguage(): SupportedLanguage {
  const current = i18n.language?.split('-')[0];
  return current === 'en' ? 'en' : 'vi';
}

export default i18n;
