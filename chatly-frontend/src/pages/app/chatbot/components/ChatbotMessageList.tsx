import { useEffect, useRef } from "react";
import { Bot, User, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AgentMessage } from "@/types/agent";
import { ChatbotThinkingIndicator } from "./ChatbotThinkingIndicator";
import { useChatbotStore } from "@/store/chatbot.store";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
    messages: AgentMessage[];
}

export function ChatbotMessageList({ messages }: Props) {
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { streamingStatus, streamingContent, statusHint } =
        useChatbotStore();

    const isStreaming =
        streamingStatus === "streaming" || streamingStatus === "connecting";
    const isThinking =
        streamingStatus === "connecting" ||
        (streamingStatus === "streaming" && streamingContent.length === 0);

    // Auto-scroll to bottom when messages change or streaming content updates
    useEffect(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, streamingContent]);

    const handleCopy = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success("Đã copy");
        } catch {
            toast.error("Không thể copy");
        }
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={cn(
                        "flex gap-3",
                        msg.role === "human" ? "flex-row-reverse" : "flex-row",
                    )}
                >
                    {/* Avatar */}
                    {msg.role === "ai" ? (
                        <div className="h-8 w-8 rounded-xl bg-linear-to-br from-brand/20 to-cyan-400/20 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-brand" />
                        </div>
                    ) : (
                        <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                    )}

                    {/* Bubble */}
                    <div
                        className={cn(
                            "max-w-[75%] group relative",
                            msg.role === "human"
                                ? "bg-brand text-white rounded-2xl rounded-tr-md px-4 py-2.5"
                                : "bg-muted/50 text-foreground rounded-2xl rounded-tl-md px-4 py-2.5",
                        )}
                    >
                        {msg.role === "ai" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-word [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:text-sm [&_table]:text-sm [&_p]:leading-relaxed">
                                <Markdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                </Markdown>
                            </div>
                        ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                            </p>
                        )}

                        {/* Copy button for AI messages */}
                        {msg.role === "ai" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -bottom-3 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                onClick={() => handleCopy(msg.content)}
                                title="Copy"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        )}

                        {/* Timestamp */}
                        <p
                            className={cn(
                                "text-[10px] mt-1",
                                msg.role === "human"
                                    ? "text-white/60"
                                    : "text-muted-foreground/60",
                            )}
                        >
                            {new Date(msg.created_at).toLocaleTimeString(
                                "vi-VN",
                                { hour: "2-digit", minute: "2-digit" },
                            )}
                        </p>
                    </div>
                </div>
            ))}

            {/* Streaming in-progress bubble */}
            {isStreaming && streamingContent.length > 0 && (
                <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-linear-to-br from-brand/20 to-cyan-400/20 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-brand" />
                    </div>
                    <div className="max-w-[75%] bg-muted/50 text-foreground rounded-2xl rounded-tl-md px-4 py-2.5">
                        <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-word [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:text-sm [&_table]:text-sm [&_p]:leading-relaxed">
                            <Markdown remarkPlugins={[remarkGfm]}>
                                {streamingContent}
                            </Markdown>
                        </div>
                        {/* Streaming cursor */}
                        <span className="inline-block w-2 h-4 bg-brand/60 animate-pulse rounded-sm ml-0.5" />
                    </div>
                </div>
            )}

            {/* Thinking indicator */}
            {isThinking && <ChatbotThinkingIndicator hint={statusHint} />}

            <div ref={scrollEndRef} />
        </div>
    );
}
