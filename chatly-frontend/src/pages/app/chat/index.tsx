import { useParams } from "react-router-dom";
import { ChatList } from "./components/ChatList";
import { WelcomeState } from "./components/WelcomeState";
import { ChatWindow } from "./components/ChatWindow";

export default function ChatPage() {
    const { id } = useParams();

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            <ChatList />
            <div className="flex-1 flex flex-col min-w-0">
                {id ? <ChatWindow id={id} /> : <WelcomeState />}
            </div>
        </div>
    );
}
