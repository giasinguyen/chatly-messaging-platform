import { useAuthStore } from "@/store/auth.store";
import { SidebarNav } from "./components/SidebarNav";
import { ChatListSide } from "./components/ChatListSide";
import { WelcomeState } from "./components/WelcomeState";

export default function ChatPage() {
    const { user } = useAuthStore();

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
            <SidebarNav user={user} />
            <ChatListSide />
            <WelcomeState />
        </div>
    );
}
