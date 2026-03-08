import ArrowRight from "@/assets/landing/arrow-right.svg";
import Logo from "@/assets/brand/chatly-logo-transparent.png";
import MenuIcon from "@/assets/landing/menu.svg";
import { Link } from "react-router-dom";

export const Header = () => {
    return (
        <header className="sticky top-0 backdrop-blur-sm z-20">
            <div className="flex justify-center items-center py-3 bg-black text-white text-sm gap-3">
                <p className="text-white/60 hidden md:block">
                    Version 1.0.0 will be officially released on May 1, 2026.
                </p>
                <div className="inline-flex gap-1 items-center">
                    <Link to="/auth/login">Try now</Link>
                    <img
                        src={ArrowRight}
                        alt="Arrow right"
                        className="h-4 w-4 inline-flex justify-center items-center"
                    />
                </div>
            </div>
            <div className="py-5">
                <div className="container">
                    <div className="flex items-center justify-between">
                        <img
                            src={Logo}
                            alt="Saas logo"
                            height={40}
                            width={40}
                        />
                        <img
                            src={MenuIcon}
                            alt="Menu icon"
                            className="h-5 w-5 md:hidden"
                        />
                        <nav className="hidden md:flex gap-6 text-black/60 items-center">
                            <a href="/terms">Terms</a>
                            <a href="/privacy">Privacy</a>
                            <button className="bg-black text-white px-4 py-2 rounded-lg font-medium inline-flex justify-center tracking-tight">
                                <Link to="/auth/login">Login</Link>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
};
