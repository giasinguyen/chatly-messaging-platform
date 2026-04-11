import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { StatusHint } from "@/types/agent";

const HINT_LABELS: Record<StatusHint, string> = {
    thinking: "Đang suy nghĩ...",
    searching_web: "Đang tìm kiếm trên mạng...",
    analyzing_documents: "Đang phân tích tài liệu...",
    generating: "Đang tạo câu trả lời...",
};

interface Props {
    hint: StatusHint;
}

export function ChatbotThinkingIndicator({ hint }: Props) {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-xl bg-linear-to-br from-brand/10 to-cyan-400/10 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-brand animate-spin" />
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground italic">
                    {HINT_LABELS[hint]}{dots}
                </span>
            </div>
        </div>
    );
}
