import { MessageCircle, Users, Settings, Cloud } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavLink } from "react-router-dom";
import type { UserResponse } from "@/types/auth";
import { cn } from "@/lib/utils";

interface SidebarProps {
    user: UserResponse | null;
}

export function Sidebar({ user }: SidebarProps) {
    const navItems = [
        { to: "/chat", icon: MessageCircle, label: "Chat" },
        { to: "/contact", icon: Users, label: "Contacts" },
        { to: "/cloud", icon: Cloud, label: "Cloud" },
    ];

    return (
        <nav className="w-16 bg-brand flex flex-col items-center py-6 justify-between shrink-0 z-20 shadow-md">
            <div className="flex flex-col items-center gap-6 w-full">
                {/* User Avatar */}
                <div className="relative mb-2 cursor-pointer transition-transform hover:scale-105">
                    <Avatar className="h-11 w-11 border-2 border-blue-400">
                        <AvatarImage
                            src={
                                user?.avatar ||
                                "https://ava-grp-talk.zadn.vn/8/0/f/0/28/360/c0bfc26e478416e3b5b298dc612d5447.jpg"
                            }
                        />
                        <AvatarFallback>
                            {user?.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-brand bg-green-500" />
                </div>

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
                                </>
                            )}
                        </NavLink>
                    ))}
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
            </div>
        </nav>
    );
}

