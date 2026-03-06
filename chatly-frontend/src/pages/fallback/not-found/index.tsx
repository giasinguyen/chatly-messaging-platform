import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import notFoundGif from "@/assets/404/404-transparent.gif";

export default function NotFoundPage() {
    return (
        <div
            style={{ background: "var(--gradient-brand)" }}
            className="flex min-h-screen flex-col items-center justify-center px-6 py-12 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif] text-white"
        >
            {/* GIF */}
            <img
                src={notFoundGif}
                alt="404 Not Found"
                className="mb-6 h-64 w-auto object-contain md:h-80"
            />

            {/* Text */}
            <h1 className="mb-2 text-4xl font-bold tracking-tight md:text-5xl">
                Oops! Page not found
            </h1>
            <p className="mb-8 max-w-md text-center text-base text-gray-500 dark:text-gray-400">
                The page you're looking for doesn't exist or has been moved.
                Let's get you back on track!
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => window.history.back()}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-gray-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
                >
                    <ArrowLeft size={16} />
                    Go Back
                </button>
                <Link
                    to="/"
                    className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-[#0077ed] active:scale-[0.98]"
                >
                    <Home size={16} />
                    Back to Home
                </Link>
            </div>
        </div>
    );
}

