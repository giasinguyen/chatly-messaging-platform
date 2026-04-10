import { Bot } from "lucide-react";

interface ChatbotHeaderProps {
    title: string;
    onBack?: () => void;
}

export function ChatbotHeader({ title }: ChatbotHeaderProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
            <div className="h-9 w-9 rounded-xl bg-linear-to-br from-brand/20 to-cyan-400/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">
                    {title}
                </h2>
                <p className="text-[11px] text-muted-foreground">AI Assistant</p>
            </div>
        </div>
    );
}
