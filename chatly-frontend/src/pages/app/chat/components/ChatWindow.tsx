import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { chatList, mockMessages } from "@/mocks/chat";

interface ChatWindowProps {
    id: string;
}

export function ChatWindow({ id }: ChatWindowProps) {
    const chat = chatList.find((c) => c.id === id);
    const messages = mockMessages[id] || [];

    if (!chat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground">
                Hội thoại không tồn tại
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
            <ChatHeader user={chat.user} />

            <div className="bg-brand/5 border-b border-border py-2 px-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand shrink-0">
                    <span className="text-xs font-bold">PT</span>
                </div>
                <p className="text-xs text-muted-foreground flex-1">
                    Gửi yêu cầu kết bạn tới người này
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="text-[11px] font-bold h-7 px-3"
                    >
                        Gửi kết bạn
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                        <span className="text-lg">...</span>
                    </Button>
                </div>
            </div>

            <MessageList messages={messages} participant={chat.user} />
            <ChatInput />
        </div>
    );
}

