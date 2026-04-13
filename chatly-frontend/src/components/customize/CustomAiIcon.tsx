import ChatlyAILogo from "@/assets/chatly-ai-logo.svg?react";
import { cn } from "@/lib/utils";

interface CustomAiIconProps {
    className?: string;
}

export function CustomAiIcon({ className }: CustomAiIconProps) {
    return (
        <ChatlyAILogo
            aria-label="Chatly AI"
            className={cn("fill-current", className)}
        />
    );
}
