import { Bot, Sparkles } from "lucide-react";

export function ChatbotEmptyState() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-brand/20 to-cyan-400/20 flex items-center justify-center">
                    <Bot className="h-10 w-10 text-brand" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
                Chatly AI Assistant
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
                Chọn một cuộc trò chuyện hoặc tạo mới để bắt đầu chat với AI.
                Bạn có thể upload tài liệu, tìm kiếm web và sử dụng MCP tools.
            </p>
        </div>
    );
}
