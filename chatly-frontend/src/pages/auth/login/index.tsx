import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Sun, Moon } from "lucide-react";
import chatlyLogo from "@/assets/brand/chatly-logo-transparent.png";
import qrCode from "@/mocks/images/QR-fake.png";
import { useThemeStore } from "@/store/theme.store";
import { ForgotPasswordDialog } from "./components/ForgotPasswordDialog";
import "./login.css";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const toggleTheme = useThemeStore((s) => s.toggleTheme);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: API integration
        console.log("Login:", { email, password });
    };

    return (
        <div className="login-page relative flex min-h-screen items-center justify-center overflow-hidden font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]">
            {/* Background decorations */}
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
            <div className="login-card-enter relative z-5 flex w-[90%] max-w-[780px] overflow-hidden rounded-[20px] border border-black/10 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-[20px] dark:border-white/8 dark:bg-[rgba(30,33,40,0.92)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                {/* Left — form */}
                <div className="flex-1 p-9 pb-8">
                    <h1 className="mb-1.5 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Welcome back!
                    </h1>
                    <p className="mb-6 text-center text-sm text-gray-500 dark:text-[#a0a3ab]">
                        We're so excited to see you again!
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-4"
                    >
                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]"
                                htmlFor="login-email"
                            >
                                Email or Phone Number{" "}
                                <span className="text-red-400">*</span>
                            </label>
                            <div className="relative flex items-center">
                                <Mail
                                    size={16}
                                    className="pointer-events-none absolute left-3 text-gray-400 transition-colors duration-200 dark:text-[#6c6f78]"
                                />
                                <input
                                    id="login-email"
                                    type="text"
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-3 pl-[38px] text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#b0b3bc]"
                                htmlFor="login-password"
                            >
                                Password <span className="text-red-400">*</span>
                            </label>
                            <div className="relative flex items-center">
                                <Lock
                                    size={16}
                                    className="pointer-events-none absolute left-3 text-gray-400 transition-colors duration-200 dark:text-[#6c6f78]"
                                />
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-10 pl-[38px] text-[15px] text-gray-900 outline-none transition-all duration-200 focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] dark:border-white/8 dark:bg-[#1a1c23] dark:text-white dark:focus:shadow-[0_0_0_3px_rgba(0,113,227,0.2)]"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-2.5 flex cursor-pointer items-center justify-center border-none bg-transparent p-1 text-gray-400 transition-colors duration-200 hover:text-gray-700 dark:text-[#6c6f78] dark:hover:text-white"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff size={16} />
                                    ) : (
                                        <Eye size={16} />
                                    )}
                                </button>
                            </div>
                            <ForgotPasswordDialog email={email} />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className="mt-1 w-full cursor-pointer rounded-full border-none bg-brand py-3 text-[15px] font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-brand-hover active:scale-[0.99]"
                        >
                            Log In
                        </button>

                        <p className="text-left text-[13px] text-gray-500 dark:text-[#6c6f78]">
                            Need an account?{" "}
                            <Link
                                to="/auth/register"
                                className="font-medium text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                            >
                                Register
                            </Link>
                        </p>
                    </form>

                    {/* Divider */}
                    <div className="my-2 flex items-center gap-3">
                        <span className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-[#6c6f78]">
                            OR
                        </span>
                        <span className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
                    </div>

                    {/* Social login */}
                    <div className="flex flex-col gap-2.5">
                        <button
                            type="button"
                            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:scale-[1.02] hover:border-gray-300 hover:bg-gray-100 active:scale-[0.99] dark:border-white/10 dark:bg-white/4 dark:text-[#d1d3da] dark:hover:border-white/18 dark:hover:bg-white/8"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span>Continue with Google</span>
                        </button>
                        <button
                            type="button"
                            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:scale-[1.02] hover:border-gray-300 hover:bg-gray-100 active:scale-[0.99] dark:border-white/10 dark:bg-white/4 dark:text-[#d1d3da] dark:hover:border-white/18 dark:hover:bg-white/8"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="#1877F2"
                            >
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span>Continue with Facebook</span>
                        </button>
                    </div>
                </div>

                {/* Right — QR Code */}
                <div className="hidden w-[240px] flex-col items-center justify-center border-l border-gray-200 p-9 px-7 text-center dark:border-white/6 md:flex">
                    <div className="mb-5 h-[160px] w-[160px] rounded-[20px] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                        <img
                            src={qrCode}
                            alt="QR Code"
                            className="h-full w-full rounded-md object-contain"
                        />
                    </div>
                    <h3 className="mb-2 text-base font-bold tracking-tight text-gray-900 dark:text-white">
                        Log in with QR Code
                    </h3>
                    <p className="text-[13px] leading-relaxed text-gray-500 dark:text-[#a0a3ab]">
                        Scan this with the{" "}
                        <strong className="text-gray-700 dark:text-[#d1d3da]">
                            Chatly mobile app
                        </strong>{" "}
                        to log in instantly.
                    </p>
                </div>
            </div>
        </div>
    );
}
