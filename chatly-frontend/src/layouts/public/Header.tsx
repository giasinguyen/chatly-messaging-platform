import Logo from "@/assets/brand/chatly-logo-transparent.png";
import MenuIcon from "@/assets/landing/menu.svg";
import { Link, useNavigate } from "react-router-dom";
import { useThemeStore } from "@/store/theme.store";
import { Sun, Moon } from "lucide-react";

import { useAuthStore } from "@/store/auth.store";
import { useState } from "react";

export const Header = () => {
    const navigate = useNavigate();
    const toggleTheme = useThemeStore((s) => s.toggleTheme);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 backdrop-blur-sm z-20 w-full">
            <div className="py-5">
                <div className="container px-4 mx-auto">
                    <div className="flex items-center justify-between">
                        <img
                            src={Logo}
                            alt="Chatly logo"
                            height={40}
                            width={40}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => navigate("/")}
                        />
                        <div className="flex items-center gap-6">
                            <nav className="hidden md:flex gap-8 text-black/60 dark:text-white/60 items-center font-medium">
                                <Link
                                    to="/terms"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                >
                                    Terms
                                </Link>
                                <Link
                                    to="/privacy"
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                >
                                    Privacy
                                </Link>

                                {/* Language Select (coming soon) */}
                                <div
                                    className="flex items-center gap-1.5 cursor-not-allowed opacity-60"
                                    title="Coming soon"
                                >
                                    <span className="text-sm">EN</span>
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
                                </div>
                            </nav>

                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex items-center gap-3 mr-1">
                                    {isAuthenticated ? (
                                        <Link
                                            to="/chat"
                                            className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 shadow-sm tracking-tight"
                                        >
                                            Go to Chat
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                to="/auth/register"
                                                className="text-brand border font-bold border-brand hover:bg-brand/5 px-5 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 tracking-tight"
                                            >
                                                Register
                                            </Link>
                                            <Link
                                                to="/auth/login"
                                                className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 shadow-sm tracking-tight"
                                            >
                                                Login
                                            </Link>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={toggleTheme}
                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 transition-all hover:bg-black/10 dark:hover:bg-white/20"
                                    aria-label="Toggle theme"
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
                                    alt="Menu icon"
                                    className="h-5 w-5 md:hidden cursor-pointer dark:invert"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {isMenuOpen && (
                        <div className="md:hidden mt-4 py-4 border-t dark:border-white/10 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
                            <Link
                                to="/terms"
                                className="text-black/70 dark:text-white/70 font-medium"
                            >
                                Terms
                            </Link>
                            <Link
                                to="/privacy"
                                className="text-black/70 dark:text-white/70 font-medium"
                            >
                                Privacy
                            </Link>

                            {/* Mobile Language Select (coming soon) */}
                            <div className="flex items-center justify-between py-1 opacity-60 cursor-not-allowed">
                                <span className="text-black/70 dark:text-white/70 font-medium">
                                    Language
                                </span>
                                <span className="text-sm font-bold text-brand">
                                    EN
                                </span>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                {isAuthenticated ? (
                                    <Link
                                        to="/chat"
                                        className="bg-brand text-white text-center py-2.5 rounded-lg font-medium"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Go to Chat
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            to="/auth/login"
                                            className="text-brand border border-brand text-center py-2.5 rounded-lg font-medium"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            to="/auth/register"
                                            className="bg-brand text-white text-center py-2.5 rounded-lg font-medium"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Register
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
                                    Switch Theme
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
