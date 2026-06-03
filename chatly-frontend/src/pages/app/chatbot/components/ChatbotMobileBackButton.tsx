import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatbotMobileBackButtonProps {
    onBack: () => void;
}

export function ChatbotMobileBackButton({ onBack }: ChatbotMobileBackButtonProps) {
    return (
        <div className="flex items-center px-2 pt-2 md:hidden">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onBack}
            >
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </div>
    );
}
