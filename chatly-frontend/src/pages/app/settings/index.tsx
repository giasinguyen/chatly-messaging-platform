import { useEffect, useState } from "react";
import { Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { GeneralSettings } from "./components/GeneralSettings";

export default function SettingPage() {
    const [activeCategory, setActiveCategory] = useState("general");
    const navigate = useNavigate();

    const handleClose = () => {
        navigate(-1);
    };

    useEffect(() => {
        alert("UI Test only, Development in progress...");
    }, []);

    return (
        <div className="flex h-full w-full overflow-hidden animate-in fade-in duration-300">
            <SettingsSidebar
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />

            <main className="flex-1 flex flex-col bg-muted/5 relative overflow-hidden">
                {activeCategory === "general" && <GeneralSettings />}

                {activeCategory !== "general" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                        <div className="h-20 w-20 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                            <Settings size={40} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Tính năng đang phát triển
                            </h3>
                            <p className="text-muted-foreground text-sm max-w-xs">
                                Mục này sẽ sớm được hoàn thiện để mang đến cho
                                bạn trải nghiệm tốt nhất.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
