import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon";

interface ChatbotHeaderProps {
    title: string;
    onBack?: () => void;
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
}

export function ChatbotHeader({ title, sidebarCollapsed, onToggleSidebar }: ChatbotHeaderProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
            {sidebarCollapsed && onToggleSidebar && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hidden md:flex"
                    onClick={onToggleSidebar}
                    title="Show sidebar"
                >
                    <PanelLeft className="h-5 w-5" />
                </Button>
            )}
            <div className="h-9 w-9 rounded-xl bg-linear-to-br from-brand/20 to-cyan-400/20 flex items-center justify-center">
                <CustomAiIcon className="h-7 w-7 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">
                    {title}
                </h2>
                <p className="text-[11px] text-muted-foreground">AI Assistant</p>
            </div>
        </div>
    );
}
