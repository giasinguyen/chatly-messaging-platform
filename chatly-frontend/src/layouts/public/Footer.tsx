import { Link } from "react-router-dom";

export const Footer = () => {
    return (
        <footer className="bg-brand-dark py-12 text-center text-sm text-brand-light/60 dark:bg-[#0f1115] dark:text-gray-400">
            <div className="container px-4 mx-auto">
                <nav className="flex flex-col md:flex-row md:justify-center gap-8 mb-8 font-medium">
                    <Link
                        to="/terms"
                        className="hover:text-brand-light dark:hover:text-white transition-colors"
                    >
                        Terms
                    </Link>
                    <Link
                        to="/privacy"
                        className="hover:text-brand-light dark:hover:text-white transition-colors"
                    >
                        Privacy
                    </Link>
                </nav>
                <p className="opacity-80">
                    &copy; 2026 Chatly Messaging Platform. All rights reserved.
                </p>
            </div>
        </footer>
    );
};
