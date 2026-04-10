import { useParams } from "react-router-dom";
import { ChatbotSessionSidebar } from "./components/ChatbotSessionSidebar";
import { ChatbotWindow } from "./components/ChatbotWindow";
import { ChatbotEmptyState } from "./components/ChatbotEmptyState";
import { cn } from "@/lib/utils";

export default function ChatbotPage() {
    const { sessionId } = useParams();

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            {/* Session sidebar — hidden on mobile when a session is selected */}
            <div
                className={cn(
                    "h-full shrink-0",
                    sessionId ? "hidden md:flex" : "w-full md:w-auto flex",
                )}
            >
                <ChatbotSessionSidebar activeSessionId={sessionId} />
            </div>

            {/* Chat canvas */}
            <div
                className={cn(
                    "flex-1 flex flex-col min-w-0 h-full",
                    !sessionId ? "hidden md:flex" : "flex",
                )}
            >
                {sessionId ? (
                    <ChatbotWindow sessionId={sessionId} />
                ) : (
                    <ChatbotEmptyState />
                )}
            </div>
        </div>
    );
}
