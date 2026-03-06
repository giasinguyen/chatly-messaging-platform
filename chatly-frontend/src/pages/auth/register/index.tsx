import { useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import chatlyLogo from "@/assets/brand/chatly-logo-transparent.png";
import { useThemeStore } from "@/store/theme.store";
import "../login/login.css"; // Reuse animated background CSS

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [month, setMonth] = useState("");
    const [day, setDay] = useState("");
    const [year, setYear] = useState("");
    const [promo, setPromo] = useState(false);

    const toggleTheme = useThemeStore((s) => s.toggleTheme);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: API integration
        console.log("Register:", {
            email,
            displayName,
            username,
            password,
            dob: `${year}-${month}-${day}`,
            promo,
        });
    };

    return (
        <div className="login-page relative flex min-h-screen items-center justify-center overflow-hidden font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]">
            {/* Background decorations (Reused from login) */}
            <div className="login-blob absolute -top-[10%] -left-[5%] h-[400px] w-[400px] rounded-full bg-brand-light opacity-35 blur-[80px]" />
            <div className="login-blob absolute -right-[3%] -bottom-[8%] h-[300px] w-[300px] rounded-full bg-brand opacity-35 blur-[80px] [animation-delay:3s]" />
            <div className="login-blob absolute top-[20%] right-[10%] h-[200px] w-[200px] rounded-full bg-brand-light opacity-35 blur-[80px] [animation-delay:6s]" />
            <div className="login-blob absolute bottom-[15%] left-[8%] h-[250px] w-[250px] rounded-full bg-brand-dark opacity-35 blur-[80px] [animation-delay:9s]" />

            {/* Stars */}
            <div className="pointer-events-none absolute inset-0">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="login-star absolute rounded-full bg-white/70 dark:bg-white/70"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 4}s`,
                            width: `${2 + Math.random() * 3}px`,
                            height: `${2 + Math.random() * 3}px`,
                        }}
                    />
                ))}
            </div>

            {/* Logo top-left */}
            <div className="absolute top-7 left-8 z-10 flex items-center gap-2.5">
                <img
                    src={chatlyLogo}
                    alt="Chatly"
                    className="h-16 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                />
            </div>

            {/* Theme toggle top-right */}
            <button
                onClick={toggleTheme}
                className="absolute top-7 right-8 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                aria-label="Toggle theme"
            >
                <Sun size={18} className="block dark:hidden" />
                <Moon size={18} className="hidden dark:block" />
            </button>

            {/* Center card */}
            <div className="login-card-enter relative z-5 flex w-[90%] max-w-[480px] flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-[20px] dark:border-white/8 dark:bg-[rgba(30,33,40,0.92)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <h1 className="mb-6 text-center text-[22px] font-bold tracking-tight text-gray-900 dark:text-white">
                    Create an account
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                            Email <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="email"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* Display Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                            Display Name
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>

                    {/* Username */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                            Username <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="password"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {/* Date of Birth */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]">
                            Date of Birth{" "}
                            <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-3">
                            {/* Month */}
                            <div className="relative flex-1">
                                <select
                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    required
                                >
                                    <option value="" disabled hidden>
                                        Month
                                    </option>
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <option key={i} value={i + 1}>
                                            {new Date(0, i).toLocaleString(
                                                "en",
                                                { month: "long" },
                                            )}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                            </div>
                            {/* Day */}
                            <div className="relative flex-1">
                                <select
                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                                    value={day}
                                    onChange={(e) => setDay(e.target.value)}
                                    required
                                >
                                    <option value="" disabled hidden>
                                        Day
                                    </option>
                                    {Array.from({ length: 31 }).map((_, i) => (
                                        <option key={i} value={i + 1}>
                                            {i + 1}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                            </div>
                            {/* Year */}
                            <div className="relative flex-1">
                                <select
                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    required
                                >
                                    <option value="" disabled hidden>
                                        Year
                                    </option>
                                    {Array.from({ length: 100 }).map((_, i) => {
                                        const y = new Date().getFullYear() - i;
                                        return (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        );
                                    })}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Promo Checkbox */}
                    <label className="mt-1 flex cursor-pointer items-start gap-3">
                        <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                            <input
                                type="checkbox"
                                className="peer h-5 w-5 appearance-none rounded-[6px] border border-gray-300 bg-white transition-all checked:border-brand checked:bg-brand dark:border-white/20 dark:bg-black/20 dark:checked:border-brand dark:checked:bg-brand"
                                checked={promo}
                                onChange={(e) => setPromo(e.target.checked)}
                            />
                            <svg
                                className="pointer-events-none absolute hidden h-3.5 w-3.5 text-white peer-checked:block"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <span className="text-[12px] leading-snug text-gray-500 dark:text-[#a0a3ab]">
                            (Optional) It's okay to send me emails with Chatly
                            updates, tips, and special offers. You can opt out
                            at any time.
                        </span>
                    </label>

                    {/* Terms */}
                    <div className="mt-1 flex flex-col gap-4">
                        <p className="text-[12px] leading-snug text-gray-500 dark:text-[#a0a3ab]">
                            By clicking "Create Account," you agree to Chatly's{" "}
                            <a
                                href="/terms"
                                className="font-medium text-brand hover:underline"
                            >
                                Terms of Service
                            </a>{" "}
                            and have read the{" "}
                            <a
                                href="/privacy"
                                className="font-medium text-brand hover:underline"
                            >
                                Privacy Policy
                            </a>
                        </p>

                        <button
                            type="submit"
                            className="w-full cursor-pointer rounded-full border-none bg-brand py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-brand-hover active:scale-[0.99]"
                        >
                            Create Account
                        </button>

                        <Link
                            to="/auth/login"
                            className="text-left text-[13px] font-medium text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                        >
                            Already have an account? Log in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
