import { useParams } from "react-router-dom";
import { useRef } from "react";
import { ChatList } from "./components/ChatList";
import { WelcomeState } from "./components/WelcomeState";
import { ChatWindow } from "./components/ChatWindow";
import { cn } from "@/lib/utils";
import type { ConversationResponse } from "@/types/conversation";

export default function ChatPage() {
    const { id } = useParams();
    const chatListRef = useRef<{ updateConversation: (conv: ConversationResponse) => void }>(null);

    const handleConversationUpdated = (updated: ConversationResponse) => {
        chatListRef.current?.updateConversation(updated);
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            {/* 
              Mobile Mode (<768px): Only show ChatList if NO id is selected.
              PC Mode (md: Flex): Always show this aside tag with auto/360px width.
            */}
            <div className={cn("h-full shrink-0", id ? "hidden md:flex" : "w-full md:w-auto flex")}>
                <ChatList ref={chatListRef} />
            </div>

            {/* 
              Mobile Mode (<768px): Only show ChatWindow if ALREADY have id.
              PC Mode (md: Flex): Always show.
            */}
            <div className={cn("flex-1 flex col min-w-0 h-full", !id ? "hidden md:flex" : "flex")}>
                {id ? <ChatWindow id={id} onConversationUpdated={handleConversationUpdated} /> : <WelcomeState />}
            </div>
        </div>
    );
}
