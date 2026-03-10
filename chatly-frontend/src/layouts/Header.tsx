import Logo from "@/assets/brand/chatly-logo-transparent.png";
import MenuIcon from "@/assets/landing/menu.svg";
import { Link, useNavigate } from "react-router-dom";
import { useThemeStore } from "@/store/theme.store";
import { Sun, Moon } from "lucide-react";

import { useAuthStore } from "@/store/auth.store";

export const Header = () => {
    const navigate = useNavigate();
    const toggleTheme = useThemeStore((s) => s.toggleTheme);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
                        <img
                            src={MenuIcon}
                            alt="Menu icon"
                            className="h-5 w-5 md:hidden cursor-pointer dark:invert"
                        />
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

                            <div className="flex items-center gap-4 ml-2">
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

                                <button className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 shadow-sm tracking-tight">
                                    <Link
                                        to={
                                            isAuthenticated
                                                ? "/chat"
                                                : "/auth/login"
                                        }
                                    >
                                        Login
                                    </Link>
                                </button>
                            </div>
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
};
