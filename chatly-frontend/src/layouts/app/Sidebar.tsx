import {
    MessageCircle,
    Users,
    Settings,
    Cloud,
    LogOut,
    Home,
    Compass,
    Clapperboard,
    LayoutDashboard,
    PlusCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { UserResponse } from "@/types/auth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { authService } from "@/services/auth.service";
import { socketService } from "@/services/socket.service";
import { toast } from "sonner";
import { NotificationBell } from "@/components/customize/NotificationBell";
import { useNotificationStore } from "@/store/notification.store";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SidebarProps {
    user: UserResponse | null;
    forceExpanded?: boolean;
}

export function Sidebar({ user, forceExpanded = false }: SidebarProps) {
    const { t } = useTranslation();
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const navigate = useNavigate();
    const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
    const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
    const collapsed = forceExpanded ? false : sidebarCollapsed;

    const msgUnreadCount = useNotificationStore(
        (s) => s.notifications.filter((n) => n.type === "NEW_MESSAGE" && !n.read).length,
    );
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error("Logout error", error);
        } finally {
            socketService.disconnect();
            clearAuth();
            toast.success(t("logout.success"));
            navigate("/auth/login");
        }
    };

    const navItems = [
        { to: "/home", icon: Home, label: t("nav.home"), badge: 0 },
        { to: "/explore", icon: Compass, label: t("nav.explore"), badge: 0 },
        { to: "/reels", icon: Clapperboard, label: t("nav.reels"), badge: 0 },
        { to: "/chat", icon: MessageCircle, label: t("nav.messages"), badge: msgUnreadCount },
        { to: "/contact", icon: Users, label: t("nav.contacts"), badge: 0 },
        { to: "/chatbot", icon: CustomAiIcon, label: t("nav.ai_chat"), badge: 0, highlight: true },
        { to: "/cloud", icon: Cloud, label: t("nav.cloud"), badge: 0 },
    ];

    const getLinkClass = (isActive: boolean, highlight?: boolean) =>
        cn(
            "relative flex items-center rounded-xl transition-all duration-200 text-sm font-medium w-full text-left cursor-pointer",
            collapsed ? "justify-center p-2.5" : "gap-3 p-2.5",
            highlight
                ? isActive
                    ? "text-[#1a146b] dark:text-white font-bold bg-[#e2dfff]/30 dark:bg-[#312e81]/20"
                    : "text-slate-500 dark:text-slate-400 hover:text-[#1a146b] dark:hover:text-white hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
                : isActive
                ? "text-[#1a146b] dark:text-white font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-[#1a146b] dark:hover:text-white hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
        );

    return (
        <nav
            className={cn(
                "h-screen bg-white dark:bg-[#1a1c23] flex flex-col p-4 space-y-2 shrink-0 z-20 border-r border-slate-100 dark:border-slate-800 transition-all duration-300 relative",
                collapsed ? "w-20 items-center" : "w-64"
            )}
        >
            {/* Toggle Button floating on the right border */}
            <button
                onClick={toggleSidebarCollapsed}
                className="absolute top-1/2 -translate-y-1/2 -right-[18px] z-30 flex items-center justify-center h-9 w-9 rounded-full bg-white dark:bg-[#2c2d3a] hover:bg-[#e2dfff]/60 dark:hover:bg-[#3f4153] text-[#1a146b] dark:text-white border border-slate-200 dark:border-slate-700/80 shadow-md hover:scale-105 transition-all duration-200 cursor-pointer"
                title={collapsed ? t("nav.expand_sidebar") : t("nav.collapse_sidebar")}
            >
                {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>

            {/* Brand Header */}
            <div className="flex items-center justify-center w-full mb-2 mt-1">
                <img
                    src="/chatly-logo-nobg.png"
                    className={cn(
                        "object-contain transition-all duration-300",
                        collapsed ? "h-16 w-16 -my-2" : "h-36 w-36 -my-6"
                    )}
                    alt="ChatLy Logo"
                />
            </div>

            {/* Navigation */}
            <div className="flex flex-col space-y-1 flex-grow w-full">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        title={item.label}
                        className={({ isActive }) => getLinkClass(isActive, item.highlight)}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && <div className="iv-nav-active-marker" />}
                                <div className="relative flex items-center justify-center">
                                    <item.icon
                                        className={cn(
                                            "h-5 w-5 transition-colors",
                                            item.highlight
                                                ? isActive
                                                    ? "text-[#202b96] drop-shadow-[0_0_6px_rgba(49,46,129,0.3)]"
                                                    : "text-[#5654a8]"
                                                : ""
                                        )}
                                    />
                                    {item.highlight && (
                                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#fc79bd] shadow-[0_0_6px_rgba(252,121,189,0.6)]" />
                                    )}
                                </div>
                                {!collapsed && <span className="font-inter text-sm">{item.label}</span>}
                                {item.badge > 0 && (
                                    collapsed ? (
                                        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[#a43073] text-white text-[8px] font-bold px-0.5 leading-none">
                                            {item.badge > 9 ? "9+" : item.badge}
                                        </span>
                                    ) : (
                                        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#a43073] text-white text-[10px] font-bold px-1 leading-none">
                                            {item.badge > 99 ? "99+" : item.badge}
                                        </span>
                                    )
                                )}
                            </>
                        )}
                    </NavLink>
                ))}

                {/* Notification */}
                <div className="flex items-center w-full">
                    <NotificationBell collapsed={collapsed} />
                </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-auto space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 w-full">
                {/* Admin Dashboard */}
                {user?.role === "ADMIN" && (
                    <NavLink
                        to="/admin/dashboard"
                        title={t("nav.admin_dashboard")}
                        className={({ isActive }) =>
                            cn(
                                "relative flex items-center rounded-xl transition-all duration-200 text-sm font-medium",
                                collapsed ? "justify-center p-2.5" : "gap-3 p-2.5",
                                isActive
                                    ? "text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-900/20"
                                    : "text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute left-[-16px] w-1 h-6 rounded-full bg-amber-400" />
                                )}
                                <LayoutDashboard className="h-5 w-5" />
                                {!collapsed && <span className="font-inter text-sm">{t("nav.dashboard")}</span>}
                            </>
                        )}
                    </NavLink>
                )}

                {/* Profile link */}
                <NavLink
                    to={`/u/${user?.username || "profile"}`}
                    title={t("nav.profile")}
                    className={({ isActive }) => getLinkClass(isActive)}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && <div className="iv-nav-active-marker" />}
                            <div className="relative">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={user?.avatarUrl} className="object-cover" />
                                    <AvatarFallback className="bg-muted text-xs text-muted-foreground font-medium">
                                        {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white bg-green-500 z-10" />
                            </div>
                            {!collapsed && <span className="font-inter text-sm flex-grow">{t("nav.profile")}</span>}
                        </>
                    )}
                </NavLink>

                {/* Settings */}
                <NavLink to="/settings" title={t("nav.settings")} className={({ isActive }) => getLinkClass(isActive)}>
                    {({ isActive }) => (
                        <>
                            {isActive && <div className="iv-nav-active-marker" />}
                            <Settings className="h-5 w-5" />
                            {!collapsed && <span className="font-inter text-sm">{t("nav.settings")}</span>}
                        </>
                    )}
                </NavLink>

                {/* Logout */}
                <button
                    onClick={() => setShowLogoutDialog(true)}
                    title={t("nav.logout")}
                    className={cn(
                        "w-full relative flex items-center rounded-xl transition-all duration-200 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/10 group cursor-pointer",
                        collapsed ? "justify-center p-2.5" : "gap-3 p-2.5"
                    )}
                >
                    <LogOut className="h-5 w-5 transition-colors group-hover:scale-110" />
                    {!collapsed && <span className="font-inter text-sm">{t("nav.logout")}</span>}
                </button>

                {/* Create Post CTA */}
                <NavLink
                    to="/home"
                    className="w-full block"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate("/home");
                    }}
                >
                    {collapsed ? (
                        <button
                            className="w-10 h-10 mx-auto flex items-center justify-center bg-[#1a146b] dark:bg-indigo-600 text-white rounded-full shadow-md hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
                            title={t("nav.create_post")}
                        >
                            <PlusCircle className="h-5 w-5" />
                        </button>
                    ) : (
                        <button className="w-full bg-[#1a146b] dark:bg-indigo-600 text-white py-3 px-6 rounded-full text-xs font-semibold tracking-wider uppercase shadow-md hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer">
                            {t("nav.create_post")}
                        </button>
                    )}
                </NavLink>
            </div>

            {/* Logout Confirm Dialog */}
            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent className="max-w-sm rounded-2xl">
                    <AlertDialogHeader className="items-center text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                            <LogOut className="h-6 w-6 text-red-500" />
                        </div>
                        <AlertDialogTitle className="text-lg">{t("logout.title")}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground">
                            {t("logout.description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row justify-center gap-3 sm:justify-center">
                        <AlertDialogCancel className="flex-1 rounded-xl">{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLogout}
                            className="flex-1 rounded-xl bg-red-500 text-white hover:bg-red-600"
                        >
                            {t("nav.logout")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </nav>
    );
}
