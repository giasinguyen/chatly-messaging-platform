import { ChatList } from "./layout/ChatList";
import { WelcomeState } from "./layout/WelcomeState";

export default function ChatPage() {
    return (
        <div className="flex">
            <ChatList />
            <WelcomeState />
        </div>
    );
}
