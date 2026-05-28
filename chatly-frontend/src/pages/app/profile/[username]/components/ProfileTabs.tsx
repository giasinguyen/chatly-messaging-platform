import { AtSign, Bookmark, Clapperboard, Grid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ProfileTab } from "./profile.types";

interface ProfileTabsProps {
    activeTab: ProfileTab;
    isOwnProfile: boolean;
    onChange: (tab: ProfileTab) => void;
}

export function ProfileTabs({ activeTab, isOwnProfile, onChange }: ProfileTabsProps) {
    const { t } = useTranslation();
    const tabs = [
        { id: "posts" as const, labelKey: "profile.posts", icon: <Grid className="h-4 w-4" /> },
        { id: "reels" as const, labelKey: "profile.reels", icon: <Clapperboard className="h-4 w-4" /> },
        { id: "tagged" as const, labelKey: "profile.tagged", icon: <AtSign className="h-4 w-4" /> },
        ...(isOwnProfile
            ? [{ id: "saved" as const, labelKey: "profile.tab_saved", icon: <Bookmark className="h-4 w-4" /> }]
            : []),
    ];

    return (
        <div className="mb-6 border-t border-border">
            <nav className="flex justify-center gap-10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            "flex items-center gap-1 border-t py-4 text-sm font-semibold uppercase tracking-widest transition-colors",
                            activeTab === tab.id
                                ? "border-foreground text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {tab.icon}
                        {t(tab.labelKey)}
                    </button>
                ))}
            </nav>
        </div>
    );
}
