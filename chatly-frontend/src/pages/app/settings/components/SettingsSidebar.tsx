import {
    Settings,
    ShieldCheck,
    RefreshCcw,
    Palette,
    Bell,
    MessageSquare,
    LayoutGrid,
    KeyRound,
    MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
    activeCategory: string;
    onCategoryChange: (id: string) => void;
}

export function SettingsSidebar({
    activeCategory,
    onCategoryChange,
}: SettingsSidebarProps) {
    const categories = [
        { id: "general", label: "General", icon: Settings },
        { id: "privacy", label: "Privacy", icon: ShieldCheck },
        { id: "sync", label: "Message Sync", icon: RefreshCcw },
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "messages", label: "Messages", icon: MessageSquare },
        { id: "change-password", label: "Change Password", icon: KeyRound },
        { id: "sessions", label: "Sessions", icon: MonitorSmartphone },
        { id: "utilities", label: "Utilities", icon: LayoutGrid },
    ];

    return (
        <aside className="w-[340px] flex flex-col border-r border-border bg-card/50 shrink-0">
            <div className="px-6 py-6 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground">Settings</h2>
            </div>

            <div className="flex-1 py-2 px-2 overflow-y-auto">
                <div className="flex flex-col gap-1">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onCategoryChange(cat.id)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group",
                                activeCategory === cat.id
                                    ? "bg-brand/10 text-brand shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <cat.icon
                                className={cn(
                                    "h-5 w-5 transition-colors",
                                    activeCategory === cat.id
                                        ? "text-brand"
                                        : "text-muted-foreground group-hover:text-foreground",
                                )}
                            />
                            <span className="text-sm font-medium">
                                {cat.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}

