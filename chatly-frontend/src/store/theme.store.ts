import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

/**
 * Resolves the effective theme based on the current setting.
 * If "system", checks the user's OS preference.
 */
export function getResolvedTheme(theme: Theme): "light" | "dark" {
    if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }
    return theme;
}

/**
 * Applies the resolved theme to the <html> element
 * by toggling the "dark" class (used by Tailwind + shadcn).
 */
export function applyThemeToDOM(theme: Theme) {
    const resolved = getResolvedTheme(theme);
    const root = document.documentElement;

    if (resolved === "dark") {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }
}

/**
 * useThemeStore
 *
 * Zustand store for managing dark/light/system theme.
 * Persisted to localStorage so the user's preference survives refresh.
 */
export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: "system",

            setTheme: (theme: Theme) => {
                set({ theme });
                applyThemeToDOM(theme);
            },

            toggleTheme: () => {
                const current = getResolvedTheme(get().theme);
                const next = current === "dark" ? "light" : "dark";
                set({ theme: next });
                applyThemeToDOM(next);
            },
        }),
        {
            name: "chatly-theme",
        },
    ),
);

