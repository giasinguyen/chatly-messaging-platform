import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { StatusHint } from "@/types/agent";

const DOT_ANIMATION_INTERVAL_MS = 500;

const HINT_LABELS: Record<StatusHint, string> = {
    thinking: "Thinking",
    searching_web: "Searching the web",
    analyzing_documents: "Analyzing documents",
    generating: "Generating response",
};

interface Props {
    hint: StatusHint;
}

export function ChatbotThinkingIndicator({ hint }: Props) {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, DOT_ANIMATION_INTERVAL_MS);
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
