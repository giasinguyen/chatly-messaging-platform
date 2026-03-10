import { MessageCircle, Users, Settings, Cloud } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserResponse } from "@/types/auth";

interface SidebarProps {
    user: UserResponse | null;
}

export function Sidebar({ user }: SidebarProps) {
    return (
        <nav className="w-16 bg-brand flex flex-col items-center py-6 justify-between shrink-0 z-20 shadow-md">
            <div className="flex flex-col items-center gap-6 w-full">
                {/* User Avatar */}
                <div className="relative mb-2 cursor-pointer transition-transform hover:scale-105">
                    <Avatar className="h-11 w-11 border-2 border-blue-400">
                        <AvatarImage
                            src={
                                user?.avatar || "https://i.pravatar.cc/150?u=me"
                            }
                        />
                        <AvatarFallback>
                            {user?.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-brand bg-green-500" />
                </div>

                {/* Nav Icons */}
                <div className="flex flex-col items-center gap-2 w-full">
                    <div className="w-full flex justify-center py-3 bg-black/20 cursor-pointer relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full" />
                        <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="w-full flex justify-center py-3 cursor-pointer hover:bg-black/10 transition-colors">
                        <Users className="h-6 w-6 text-white/70" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full flex justify-center py-3 cursor-pointer hover:bg-black/10 transition-colors">
                    <Cloud className="h-6 w-6 text-white/70" />
                </div>
                <div className="w-full flex justify-center py-3 cursor-pointer hover:bg-black/10 transition-colors">
                    <Settings className="h-6 w-6 text-white/70" />
                </div>
            </div>
        </nav>
    );
}

