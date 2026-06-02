import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import vi from "./locales/vi.json";

export const SUPPORTED_LANGUAGES = ["vi", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "chatly-lang";

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            vi: { translation: vi },
        },
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES,
        nonExplicitSupportedLngs: true,
        interpolation: { escapeValue: false },
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
            caches: ["localStorage"],
        },
        returnNull: false,
    });

export function setAppLanguage(lang: SupportedLanguage): void {
    void i18n.changeLanguage(lang);
    if (typeof document !== "undefined") {
        document.documentElement.lang = lang;
    }
}

if (typeof document !== "undefined") {
    document.documentElement.lang = i18n.resolvedLanguage || DEFAULT_LANGUAGE;
    i18n.on("languageChanged", (lng) => {
        document.documentElement.lang = lng;
    });
}

export default i18n;
