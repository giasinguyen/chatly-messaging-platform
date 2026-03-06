import { useEffect } from "react";
import {
    useThemeStore,
    applyThemeToDOM,
    getResolvedTheme,
} from "@/store/theme.store";

/**
 * ThemeInitializer
 *
 * Place this once at the app root (e.g. in App.tsx).
 * It applies the persisted theme on mount and listens
 * for OS-level theme changes when mode is "system".
 */
export function ThemeInitializer() {
    const theme = useThemeStore((s) => s.theme);

    // Apply theme on mount + when theme changes
    useEffect(() => {
        applyThemeToDOM(theme);
    }, [theme]);

    // Listen for OS preference changes when mode is "system"
    useEffect(() => {
        if (theme !== "system") return;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => applyThemeToDOM("system");

        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    return null;
}

/**
 * Hook to get the currently resolved theme ("light" | "dark")
 * regardless of whether the store value is "system".
 */
export function useResolvedTheme(): "light" | "dark" {
    const theme = useThemeStore((s) => s.theme);
    return getResolvedTheme(theme);
}

