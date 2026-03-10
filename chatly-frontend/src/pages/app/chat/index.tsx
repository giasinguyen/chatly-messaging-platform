import { ChatList } from "./ChatList";
import { WelcomeState } from "./components/WelcomeState";

export default function ChatPage() {
    return (
        <div className="flex ">
            <ChatList />
            <WelcomeState />
        </div>
    );
}
