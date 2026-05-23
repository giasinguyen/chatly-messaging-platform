import { useMemo, useState } from "react";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { GeneralSettings } from "./components/GeneralSettings";
import { PrivacySettings } from "./components/PrivacySettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import { NotificationsSettings } from "./components/NotificationsSettings";
import { MessagesSettings } from "./components/MessagesSettings";
import { ChangePasswordSettings } from "./components/ChangePasswordSettings";
import { SessionSettings } from "./components/SessionSettings";
import { UtilitiesSettings } from "./components/UtilitiesSettings";
import SavedPage from "@/pages/app/saved";

export default function SettingPage() {
    const [activeCategory, setActiveCategory] = useState("general");

    const content = useMemo(() => {
        switch (activeCategory) {
            case "general":
                return <GeneralSettings />;
            case "privacy":
                return <PrivacySettings />;
            case "appearance":
                return <AppearanceSettings />;
            case "notifications":
                return <NotificationsSettings />;
            case "messages":
                return <MessagesSettings />;
            case "change-password":
                return <ChangePasswordSettings />;
            case "sessions":
                return <SessionSettings />;
            case "saved-posts":
                return <SavedPage />;
            case "utilities":
                return <UtilitiesSettings />;
            default:
                return <GeneralSettings />;
        }
    }, [activeCategory]);

    return (
        <div className="flex h-full w-full overflow-hidden animate-in fade-in duration-300">
            <SettingsSidebar
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />

            <main className="flex-1 flex flex-col bg-muted/5 relative overflow-hidden">
                {content}
            </main>
        </div>
    );
}
