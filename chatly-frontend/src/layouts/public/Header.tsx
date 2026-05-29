import MenuIcon from "@/assets/landing/menu.svg";
import { Link, useNavigate } from "react-router-dom";
import { useThemeStore } from "@/store/theme.store";
import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { setAppLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

import { useAuthStore } from "@/store/auth.store";
import { useState } from "react";

export const Header = () => {
    const navigate = useNavigate();
    const toggleTheme = useThemeStore((s) => s.toggleTheme);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { t, i18n } = useTranslation();

    const currentLang = (
        SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
            ? i18n.language
            : "vi"
    ) as SupportedLanguage;

    const handleLangChange = (lang: SupportedLanguage) => {
        setAppLanguage(lang);
    };

    return (
        <header className="fixed top-0 z-20 w-full h-16 overflow-visible bg-[#EAEEFE]/80 backdrop-blur-sm dark:bg-[#1a1c23]/80 md:h-20">
            <div className="container relative h-full px-4 mx-auto">
                <div className="flex h-full items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        aria-label="Chatly home"
                        className="relative h-10 w-28 shrink-0 md:h-12 md:w-32"
                    >
                        <img
                            src="/chatly-logo-nobg.png"
                            alt=""
                            className="absolute left-0 top-1/2 h-24 w-24 -translate-y-1/2 object-contain transition-all duration-200 hover:scale-105 hover:opacity-90 dark:hidden sm:h-28 sm:w-28 md:h-32 md:w-32"
                        />
                        <img
                            src="/chatly-logo-white.png"
                            alt=""
                            className="absolute left-0 top-1/2 hidden h-24 w-24 -translate-y-1/2 object-contain transition-all duration-200 hover:scale-105 hover:opacity-90 dark:block sm:h-28 sm:w-28 md:h-32 md:w-32"
                        />
                    </button>
                    <div className="flex items-center gap-6">
                            <nav className="hidden md:flex gap-8 text-black/60 dark:text-white/60 items-center font-medium">
                                <Link
                                    to="/terms"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                >
                                    {t("landing.terms")}
                                </Link>
                                <Link
                                    to="/privacy"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                >
                                    {t("landing.privacy")}
                                </Link>

                                <div className="relative group">
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                                    >
                                        <span className="text-sm uppercase">{currentLang}</span>
                                        <svg
                                            width="10"
                                            height="6"
                                            viewBox="0 0 10 6"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M1 1L5 5L9 1"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block min-w-[120px] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg py-1 z-30">
                                        {SUPPORTED_LANGUAGES.map((lang) => (
                                            <button
                                                key={lang}
                                                type="button"
                                                onClick={() => handleLangChange(lang)}
                                                className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 ${
                                                    currentLang === lang
                                                        ? "font-semibold text-brand"
                                                        : "text-black/70 dark:text-white/70"
                                                }`}
                                            >
                                                {lang === "vi"
                                                    ? t("settings.general.vietnamese")
                                                    : t("settings.general.english")}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </nav>

                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex items-center gap-3 mr-1">
                                    {isAuthenticated ? (
                                        <Link
                                            to="/home"
                                            className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 shadow-sm tracking-tight"
                                        >
                                            {t("landing.go_to_chat")}
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                to="/auth/register"
                                                className="text-brand border font-bold border-brand hover:bg-brand/5 px-5 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 tracking-tight"
                                            >
                                                {t("landing.register")}
                                            </Link>
                                            <Link
                                                to="/auth/login"
                                                className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 shadow-sm tracking-tight"
                                            >
                                                {t("landing.login")}
                                            </Link>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={toggleTheme}
                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 transition-all hover:bg-black/10 dark:hover:bg-white/20"
                                    aria-label={t("landing.toggle_theme")}
                                >
                                    <Sun
                                        size={18}
                                        className="block dark:hidden"
                                    />
                                    <Moon
                                        size={18}
                                        className="hidden dark:block"
                                    />
                                </button>

                                <img
                                    src={MenuIcon}
                                    alt={t("landing.open_menu")}
                                    className="h-5 w-5 md:hidden cursor-pointer dark:invert"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                />
                            </div>
                    </div>
                </div>

                {isMenuOpen && (
                    <div className="md:hidden absolute inset-x-0 top-full z-30 border-t border-black/10 bg-[#EAEEFE] px-4 py-4 shadow-lg dark:border-white/10 dark:bg-[#1a1c23] flex flex-col gap-4 animate-in slide-in-from-top duration-300">
                            <Link
                                to="/terms"
                                className="text-black/70 dark:text-white/70 font-medium"
                            >
                                {t("landing.terms")}
                            </Link>
                            <Link
                                to="/privacy"
                                className="text-black/70 dark:text-white/70 font-medium"
                            >
                                {t("landing.privacy")}
                            </Link>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-black/70 dark:text-white/70 font-medium">
                                    {t("landing.language")}
                                </span>
                                <div className="flex items-center gap-2">
                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                        <button
                                            key={lang}
                                            type="button"
                                            onClick={() => handleLangChange(lang)}
                                            className={`text-sm font-bold px-2 py-1 rounded ${
                                                currentLang === lang
                                                    ? "bg-brand/10 text-brand"
                                                    : "text-black/60 dark:text-white/60"
                                            }`}
                                        >
                                            {lang.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                {isAuthenticated ? (
                                    <Link
                                        to="/chat"
                                        className="bg-brand text-white text-center py-2.5 rounded-lg font-medium"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {t("landing.go_to_chat")}
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            to="/auth/login"
                                            className="text-brand border border-brand text-center py-2.5 rounded-lg font-medium"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {t("landing.login")}
                                        </Link>
                                        <Link
                                            to="/auth/register"
                                            className="bg-brand text-white text-center py-2.5 rounded-lg font-medium"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {t("landing.register")}
                                        </Link>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        toggleTheme();
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-black/5 dark:bg-white/10 rounded-lg text-black/70 dark:text-white/70"
                                >
                                    {document.documentElement.classList.contains(
                                        "dark",
                                    ) ? (
                                        <Sun size={18} />
                                    ) : (
                                        <Moon size={18} />
                                    )}
                                    {t("landing.switch_theme")}
                                </button>
                            </div>
                    </div>
                )}
            </div>
        </header>
    );
};
