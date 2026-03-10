import { ChatList } from "./components/ChatList";
import { WelcomeState } from "./components/WelcomeState";

export default function ChatPage() {
    return (
        <div className="flex">
            <ChatList />
            <WelcomeState />
        </div>
    );
}
