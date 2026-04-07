import { useParams } from "react-router-dom";
import { ChatList } from "./components/ChatList";
import { WelcomeState } from "./components/WelcomeState";
import { ChatWindow } from "./components/ChatWindow";
import { cn } from "@/lib/utils";

export default function ChatPage() {
    const { id } = useParams();

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            {/* 
              Chế độ Mobile (<768px): Chỉ hiển thị ChatList nếu CHƯA chọn id.
              Chế độ PC (md: Flex): Luôn hiện thẻ aside này với chiều rộng auto/360px.
            */}
            <div className={cn("h-full shrink-0", id ? "hidden md:flex" : "w-full md:w-auto flex")}>
                <ChatList />
            </div>

            {/* 
              Chế độ Mobile (<768px): Chỉ hiển thị ChatWindow nếu ĐÃ có id.
              Chế độ PC (md: Flex): Luôn hiện.
            */}
            <div className={cn("flex-1 flex col min-w-0 h-full", !id ? "hidden md:flex" : "flex")}>
                {id ? <ChatWindow id={id} /> : <WelcomeState />}
            </div>
        </div>
    );
}
