import {
    Smile,
    Image as ImageIcon,
    Paperclip,
    AtSign,
    CaseSensitive,
    MessageSquareQuote,
    SendHorizontal,
    ThumbsUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChatInput() {
    return (
        <div className="border-t border-border p-4 bg-background">
            <div className="flex items-center gap-1 mb-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <Smile size={20} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <ImageIcon size={20} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <Paperclip size={20} />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <AtSign size={20} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <CaseSensitive size={20} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <MessageSquareQuote size={20} />
                </Button>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Input
                        placeholder="Nhập @, tin nhắn tới người này"
                        className="bg-transparent border-transparent focus-visible:ring-0 focus-visible:border-transparent p-0 h-10 text-sm shadow-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-brand"
                    >
                        <ThumbsUp size={20} />
                    </Button>
                    <Button className="h-9 px-4 bg-brand text-white hover:bg-brand/90 shadow-lg shadow-brand/20">
                        <SendHorizontal size={18} className="mr-2" />
                        Gửi
                    </Button>
                </div>
            </div>
        </div>
    );
}

