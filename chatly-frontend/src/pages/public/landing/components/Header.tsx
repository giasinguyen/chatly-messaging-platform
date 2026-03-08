import Logo from "@/assets/brand/chatly-logo-transparent.png";
import MenuIcon from "@/assets/landing/menu.svg";
import { Link } from "react-router-dom";

export const Header = () => {
    return (
        <header className="sticky top-0 backdrop-blur-sm z-20">
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
                            <button className="bg-brand text-white px-4 py-2 rounded-lg font-medium inline-flex justify-center tracking-tight hover:bg-brand-hover transition-colors">
                                <Link to="/auth/login">Login</Link>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
};
