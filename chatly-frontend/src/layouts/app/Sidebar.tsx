import { MessageCircle, Users, Settings, Cloud, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavLink, useNavigate } from "react-router-dom";
import type { UserResponse } from "@/types/auth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";
import { NotificationBell } from "@/components/customize/NotificationBell";
import { useNotificationStore } from "@/store/notification.store";

interface SidebarProps {
    user: UserResponse | null;
}

export function Sidebar({ user }: SidebarProps) {
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const navigate = useNavigate();
    const msgUnreadCount = useNotificationStore(
        (s) => s.notifications.filter((n) => n.type === "NEW_MESSAGE" && !n.read).length,
    );

    const handleLogout = async () => {
        try {
            await authService.logout();
            clearAuth();
            toast.success("Đã đăng xuất thành công");
            navigate("/auth/login");
        } catch (error) {
            console.error("Logout error", error);
            clearAuth();
            navigate("/auth/login");
        }
    };

    const navItems = [
        { to: "/chat", icon: MessageCircle, label: "Chat", badge: msgUnreadCount },
        { to: "/contact", icon: Users, label: "Contacts", badge: 0 },
        { to: "/cloud", icon: Cloud, label: "Cloud", badge: 0 },
    ];

    return (
        <nav className="w-16 bg-brand flex flex-col items-center py-6 justify-between shrink-0 z-20 shadow-md">
            <div className="flex flex-col items-center gap-6 w-full">
                {/* User Avatar */}
                <NavLink
                    to="/profile"
                    className="relative mb-2 transition-transform hover:scale-105"
                    title="Hồ sơ cá nhân"
                >
                    <Avatar className="h-11 w-11 border-2 border-blue-400">
                        <AvatarImage
                            src={user?.avatarUrl}
                            className="object-cover"
                        />
                        <AvatarFallback className="bg-muted text-lg text-muted-foreground font-medium">
                            {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-brand bg-green-500" />
                </NavLink>

                {/* Nav Icons */}
                <div className="flex flex-col items-center gap-1 w-full">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
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
                                    <item.icon
                                        className={cn(
                                            "h-6 w-6 transition-colors",
                                            isActive
                                                ? "text-white"
                                                : "text-white/70",
                                        )}
                                    />
                                    {item.badge > 0 && (
                                        <span className="absolute top-2 right-2 min-w-4.5 h-4.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                                            {item.badge > 99 ? "99+" : item.badge}
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
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="w-full flex justify-center py-3 relative transition-colors hover:bg-black/10 text-white/70 hover:text-red-400 group"
                >
                    <LogOut className="h-6 w-6 transition-colors group-hover:scale-110" />
                </button>
            </div>
        </nav>
    );
}

