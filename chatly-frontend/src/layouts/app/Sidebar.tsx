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
} from "lucide-react";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavLink, useNavigate } from "react-router-dom";
import type { UserResponse } from "@/types/auth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { socketService } from "@/services/socket.service";
import { toast } from "sonner";
import { NotificationBell } from "@/components/customize/NotificationBell";
import { useNotificationStore } from "@/store/notification.store";
import { useState, useEffect } from "react";
import { storyService } from "@/services/story.service";
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
}

export function Sidebar({ user }: SidebarProps) {
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const navigate = useNavigate();
    const msgUnreadCount = useNotificationStore(
        (s) =>
            s.notifications.filter((n) => n.type === "NEW_MESSAGE" && !n.read)
                .length,
    );
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [hasActiveStories, setHasActiveStories] = useState(false);

    useEffect(() => {
        const checkStories = async () => {
            try {
                const res = await storyService.getMyStories();
                if (res.code === 1000) {
                    // Check if any story was created in the last 24h
                    const now = new Date().getTime();
                    const dayAgo = now - 24 * 60 * 60 * 1000;
                    const hasRecent = res.result.some(
                        (s) => new Date(s.createdAt).getTime() > dayAgo,
                    );
                    setHasActiveStories(hasRecent);
                }
            } catch (error) {
                console.error("Failed to check stories", error);
            }
        };
        checkStories();
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
            socketService.disconnect();
            clearAuth();
            toast.success("Logged out successfully");
            navigate("/auth/login");
        } catch (error) {
            console.error("Logout error", error);
            socketService.disconnect();
            clearAuth();
            navigate("/auth/login");
        }
    };

    const navItems = [
        { to: "/home", icon: Home, label: "Home", badge: 0 },
        { to: "/reels", icon: Clapperboard, label: "Reels", badge: 0 },
        { to: "/explore", icon: Compass, label: "Explore", badge: 0 },
        {
            to: "/chat",
            icon: MessageCircle,
            label: "Chat",
            badge: msgUnreadCount,
        },
        { to: "/contact", icon: Users, label: "Contacts", badge: 0 },
        {
            to: "/chatbot",
            icon: CustomAiIcon,
            label: "AI Chat",
            badge: 0,
            highlight: true,
        },
        { to: "/cloud", icon: Cloud, label: "Cloud", badge: 0 },
    ];

    return (
        <nav className="w-16 bg-brand flex flex-col items-center py-6 justify-between shrink-0 z-20 shadow-md">
            <div className="flex flex-col items-center gap-6 w-full">
                {/* User Avatar */}
                <NavLink
                    to={`/u/${user?.username || "profile"}`}
                    className="relative mb-2 transition-transform hover:scale-105"
                    title="Profile"
                >
                    <div
                        className={cn(
                            "p-[2px] rounded-full",
                            hasActiveStories
                                ? "bg-gradient-to-tr from-brand via-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                : "bg-transparent",
                        )}
                    >
                        <div className="bg-brand p-[2px] rounded-full">
                            <Avatar
                                className={cn(
                                    "h-11 w-11",
                                    !hasActiveStories &&
                                        "border-2 border-blue-400/30",
                                )}
                            >
                                <AvatarImage
                                    src={user?.avatarUrl}
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-muted text-lg text-muted-foreground font-medium">
                                    {user?.displayName
                                        ?.charAt(0)
                                        ?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-brand bg-green-500 z-10" />
                </NavLink>

                {/* Nav Icons */}
                <div className="flex flex-col items-center gap-1 w-full">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={item.label}
                            className={({ isActive }) =>
                                cn(
                                    "w-full flex justify-center py-3 relative transition-all duration-300",
                                    item.highlight
                                        ? isActive
                                            ? "bg-linear-to-r from-blue-500/30 to-cyan-400/20"
                                            : "hover:bg-linear-to-r hover:from-blue-500/20 hover:to-cyan-400/10 text-white/70"
                                        : isActive
                                          ? "bg-black/20"
                                          : "hover:bg-black/10 text-white/70",
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div
                                            className={cn(
                                                "absolute left-0 top-0 bottom-0 w-1 rounded-r-full",
                                                item.highlight
                                                    ? "bg-linear-to-b from-blue-400 to-cyan-300"
                                                    : "bg-white",
                                            )}
                                        />
                                    )}
                                    <div
                                        className={cn(
                                            "relative",
                                            item.highlight &&
                                                !isActive &&
                                                "animate-pulse-subtle",
                                        )}
                                    >
                                        <item.icon
                                            className={cn(
                                                "h-6 w-6 transition-colors",
                                                item.highlight
                                                    ? isActive
                                                        ? "text-cyan-200 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]"
                                                        : "text-cyan-300/80"
                                                    : isActive
                                                      ? "text-white"
                                                      : "text-white/70",
                                            )}
                                        />
                                        {item.highlight && (
                                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
                                        )}
                                    </div>
                                    {item.badge > 0 && (
                                        <span className="absolute top-2 right-2 min-w-4.5 h-4.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                                            {item.badge > 99
                                                ? "99+"
                                                : item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}

                    {/* Notification Bell */}
                    <NotificationBell />
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 w-full">
                {/* Admin Dashboard button — visible only to ADMIN users */}
                {user?.role === "ADMIN" && (
                    <NavLink
                        to="/admin/dashboard"
                        title="Admin Dashboard"
                        className={({ isActive }) =>
                            cn(
                                "w-full flex justify-center py-3 relative transition-colors",
                                isActive
                                    ? "bg-black/20"
                                    : "hover:bg-black/10 text-white/70",
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-r-full" />
                                )}
                                <LayoutDashboard
                                    className={cn(
                                        "h-6 w-6 transition-colors",
                                        isActive
                                            ? "text-amber-300"
                                            : "text-white/70",
                                    )}
                                />
                            </>
                        )}
                    </NavLink>
                )}

                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        cn(
                            "w-full flex justify-center py-3 relative transition-colors",
                            isActive
                                ? "bg-black/20"
                                : "hover:bg-black/10 text-white/70",
                        )
                    }
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full" />
                            )}
                            <Settings
                                className={cn(
                                    "h-6 w-6 transition-colors",
                                    isActive ? "text-white" : "text-white/70",
                                )}
                            />
                        </>
                    )}
                </NavLink>

                {/* Logout Button */}
                <button
                    onClick={() => setShowLogoutDialog(true)}
                    title="Logout"
                    className="w-full flex justify-center py-3 relative transition-colors hover:bg-black/10 text-white/70 hover:text-red-400 group"
                >
                    <LogOut className="h-6 w-6 transition-colors group-hover:scale-110" />
                </button>
            </div>

            {/* Logout Confirm Dialog */}
            <AlertDialog
                open={showLogoutDialog}
                onOpenChange={setShowLogoutDialog}
            >
                <AlertDialogContent className="max-w-sm rounded-2xl">
                    <AlertDialogHeader className="items-center text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                            <LogOut className="h-6 w-6 text-red-500" />
                        </div>
                        <AlertDialogTitle className="text-lg">
                            Logout?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground">
                            You will need to log in again to use Chatly. Proceed
                            to log out?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row justify-center gap-3 sm:justify-center">
                        <AlertDialogCancel className="flex-1 rounded-xl">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLogout}
                            className="flex-1 rounded-xl bg-red-500 text-white hover:bg-red-600"
                        >
                            Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </nav>
    );
}
