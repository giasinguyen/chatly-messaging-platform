import { useState, useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import {
    SendHorizontal,
    X,
    CornerUpLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types/message";

interface ChatInputProps {
    replyingTo?: Message | null;
    senderName?: string;
    onCancelReply: () => void;
    onSendMessage: (content: string) => void;
    onTyping?: (typing: boolean) => void;
}

const TYPING_STOP_DELAY = 2000;

export function ChatInput({
    replyingTo,
    senderName,
    onCancelReply,
    onSendMessage,
    onTyping,
}: ChatInputProps) {
    const [content, setContent] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const typingTimerRef = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ----------------------------------------------------------------
    // Typing Logic
    // ----------------------------------------------------------------
    const stopTyping = useCallback(() => {
        if (isTyping) {
            setIsTyping(false);
            onTyping?.(false);
        }
    }, [isTyping, onTyping]);

    const handleContentChange = (newVal: string) => {
        setContent(newVal);

        if (!isTyping && newVal.trim().length > 0) {
            setIsTyping(true);
            onTyping?.(true);
        }

        // Reset stop timer
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            stopTyping();
        }, TYPING_STOP_DELAY);
    };

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, []);

    // Focus input when replying
    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    const handleSend = () => {
        if (!content.trim()) return;
        
        // Ngừng typing ngay khi gửi
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        stopTyping();
        
        onSendMessage(content.trim());
        setContent("");
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t border-border bg-background font-inter">
            {/* Reply preview bar */}
            {replyingTo && (
                <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5 bg-muted/30 border-b border-border/50">
                    <CornerUpLeft size={14} className="text-brand shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-brand">
                            {senderName ?? "Bạn"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                            {replyingTo.content}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={onCancelReply}
                    >
                        <X size={12} />
                    </Button>
                </div>
            )}

            <div className="p-4 px-6">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            placeholder="Nhập tin nhắn tới người này"
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="bg-transparent border-transparent focus-visible:ring-0 focus-visible:border-transparent p-0 h-10 text-[15px] shadow-none placeholder:text-muted-foreground/50"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={handleSend}
                            disabled={!content.trim()}
                            className="h-10 px-6 bg-brand text-white hover:bg-brand/90 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            <SendHorizontal size={18} className="mr-2" />
                            <span className="font-medium text-sm">Gửi</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
