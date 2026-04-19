import { useState } from "react";
import { useParams } from "react-router-dom";
import { ChatbotSessionSidebar } from "./components/ChatbotSessionSidebar";
import { ChatbotWindow } from "./components/ChatbotWindow";
import { cn } from "@/lib/utils";

export default function ChatbotPage() {
    const { sessionId } = useParams();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            {/* Session sidebar — hidden on mobile when a session is selected */}
            <div
                className={cn(
                    "h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
                    sessionId ? "hidden md:block" : "w-full md:block",
                    sidebarCollapsed ? "md:w-0" : "md:w-80",
                )}
            >
                <ChatbotSessionSidebar
                    activeSessionId={sessionId}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
                />
            </div>

            {/* Chat canvas — hidden on mobile when no session is selected */}
            <div
                className={cn(
                    "flex-1 flex flex-col min-w-0 h-full",
                    !sessionId ? "hidden md:flex" : "flex",
                )}
            >
                <ChatbotWindow
                    sessionId={sessionId}
                    sidebarCollapsed={sidebarCollapsed}
                    onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
                />
            </div>
        </div>
    );
}
