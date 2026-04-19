import { Sparkles, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon";

interface ChatbotEmptyStateProps {
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
}

export function ChatbotEmptyState({ sidebarCollapsed, onToggleSidebar }: ChatbotEmptyStateProps) {
    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Expand sidebar button — only shown when sidebar is collapsed */}
            {sidebarCollapsed && onToggleSidebar && (
                <div className="px-4 py-3 border-b border-border shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-foreground hidden md:flex"
                        onClick={onToggleSidebar}
                        title="Show sidebar"
                    >
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                </div>
            )}
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="relative">
                    <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-brand/20 to-cyan-400/20 flex items-center justify-center">
                        <CustomAiIcon className="h-14 w-14 text-brand" />
                    </div>
                    <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-cyan-400" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                    Chatly AI Assistant
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Type a question to start chatting with AI.
                    You can upload documents, search the web, and use MCP tools.
                </p>
            </div>
        </div>
    );
}
