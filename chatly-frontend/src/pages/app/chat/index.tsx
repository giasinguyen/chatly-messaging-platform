import { useAuthStore } from "@/store/auth.store";
import { Link } from "react-router-dom";
import { LogOut, User, Mail, UserCircle, MessageSquare } from "lucide-react";

export default function ChatPage() {
    const { user, clearAuth } = useAuthStore();

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
                <div className="text-center">
                    <p className="mb-4 text-gray-500">
                        Đang tải thông tin hoặc bạn chưa đăng nhập...
                    </p>
                    <Link
                        to="/auth/login"
                        className="text-brand hover:underline"
                    >
                        Quay lại đăng nhập
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-gray-50 dark:bg-black">
            {/* Header Demo */}
            <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#1a1c23]">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <MessageSquare size={20} />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                        Chatly
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-white/10">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {user.displayName}
                            </p>
                            <p className="text-[11px] text-gray-500">
                                @{user.username}
                            </p>
                        </div>
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt="avatar"
                                className="h-9 w-9 rounded-full object-cover"
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                <User size={20} />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => clearAuth()}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                        <LogOut size={18} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </header>

            {/* Content Demo */}
            <main className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-2xl transform space-y-8 rounded-3xl bg-white p-10 shadow-sm transition-all dark:bg-[#1a1c23] dark:shadow-none sm:p-12">
                    <div className="text-center">
                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-brand/10 text-brand">
                            <UserCircle size={48} />
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            Chào mừng quay lại, {user.displayName}!
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Đây là thông tin của bạn được lấy từ Global State
                            (Zustand)
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-white/2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                User ID
                            </p>
                            <p className="mt-1 font-mono text-sm text-gray-700 dark:text-[#a0a3ab]">
                                {user.id}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-white/2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                Username
                            </p>
                            <p className="mt-1 font-medium text-gray-700 dark:text-[#a0a3ab]">
                                {user.username}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-white/5 dark:bg-white/2 sm:col-span-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                                <Mail size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    Email / ID
                                </p>
                                <p className="mt-0.5 font-medium text-gray-700 dark:text-[#a0a3ab]">
                                    {user.email || "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-center">
                        <p className="text-sm text-brand-hover dark:text-brand-light">
                            ✨ Hệ thống đang hoạt động ổn định.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
