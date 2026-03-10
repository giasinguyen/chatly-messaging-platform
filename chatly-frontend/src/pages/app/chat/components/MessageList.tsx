import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, User } from "@/mocks/chat";

interface MessageListProps {
    messages: Message[];
    participant: User;
}

export function MessageList({ messages, participant }: MessageListProps) {
    const scrollEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const renderMessage = (msg: Message) => {
        const isMe = msg.senderId === "me";

        return (
            <div
                key={msg.id}
                className={cn(
                    "flex items-end gap-2 mb-4 group px-4",
                    isMe ? "flex-row-reverse" : "flex-row",
                )}
            >
                {!isMe && (
                    <Avatar className="h-8 w-8 mb-1 border border-border/30">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>
                            {participant.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                )}

                <div
                    className={cn(
                        "flex flex-col max-w-[70%]",
                        isMe ? "items-end" : "items-start",
                    )}
                >
                    <div
                        className={cn(
                            "px-3 py-2 rounded-2xl text-sm shadow-sm transition-all",
                            isMe
                                ? "bg-brand text-white rounded-br-none"
                                : "bg-card border border-border/50 rounded-bl-none text-foreground",
                        )}
                    >
                        {msg.text}
                    </div>

                    <div
                        className={cn(
                            "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1",
                        )}
                    >
                        <span className="text-[10px] text-muted-foreground">
                            {msg.timestamp}
                        </span>
                        {isMe && (
                            <span className="text-brand">
                                {msg.status === "read" ? (
                                    <CheckCheck size={12} />
                                ) : (
                                    <Check size={12} />
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 overflow-y-auto bg-muted/20">
            <div className="py-6 flex flex-col min-h-full">
                {/* Date separator example */}
                <div className="flex justify-center mb-6">
                    <span className="px-3 py-1 bg-black/10 dark:bg-white/10 rounded-full text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Hôm qua
                    </span>
                </div>

                {messages.map(renderMessage)}
                <div ref={scrollEndRef} />
            </div>
        </div>
    );
}

