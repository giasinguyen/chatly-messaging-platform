import {
    Settings,
    ShieldCheck,
    Palette,
    Bell,
    MessageSquare,
    KeyRound,
    MonitorSmartphone,
    Bookmark,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
    activeCategory: string;
    onCategoryChange: (id: string) => void;
}

export function SettingsSidebar({
    activeCategory,
    onCategoryChange,
}: SettingsSidebarProps) {
    const { t } = useTranslation();
    const categories = [
        { id: "general", labelKey: "settings.categories.general", icon: Settings },
        { id: "privacy", labelKey: "settings.categories.privacy", icon: ShieldCheck },
        { id: "change-password", labelKey: "settings.categories.change_password", icon: KeyRound },
        { id: "sessions", labelKey: "settings.categories.sessions", icon: MonitorSmartphone },
        { id: "saved-posts", labelKey: "settings.categories.saved_posts", icon: Bookmark },
        { id: "appearance", labelKey: "settings.categories.appearance", icon: Palette },
        { id: "notifications", labelKey: "settings.categories.notifications", icon: Bell },
        { id: "messages", labelKey: "settings.categories.messages", icon: MessageSquare },
    ];

    return (
        <aside className="w-[340px] flex flex-col border-r border-border bg-card/50 shrink-0">
            <div className="px-6 py-6 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground">
                    {t("settings.title")}
                </h2>
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
                                {t(cat.labelKey)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
