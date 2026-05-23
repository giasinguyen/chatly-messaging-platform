import { useEffect, useRef, useCallback, useState } from "react";
import { Copy, RotateCcw, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentMessage } from "@/types/agent";
import { ChatbotThinkingIndicator } from "./ChatbotThinkingIndicator";
import { ChatbotMessageMenu } from "./ChatbotMessageMenu";
import { AttachmentPreview } from "./AttachmentPreview";
import { useChatbotStore } from "@/store/chatbot.store";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

const SCROLL_NEAR_BOTTOM_THRESHOLD_PX = 120;

const MARKDOWN_CLASSES =
    "prose prose-sm dark:prose-invert max-w-none wrap-break-word [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:text-sm [&_table]:text-sm [&_p]:leading-relaxed [&_img]:rounded-lg [&_img]:max-h-80";

interface Props {
    messages: AgentMessage[];
    sessionId: string;
    onEdit?: (message: AgentMessage) => void;
    onRetry?: (message: AgentMessage) => void;
    onRetryLast?: () => void;
    onForwardToChat?: (message: AgentMessage) => void;
}

export function ChatbotMessageList({ messages, sessionId, onEdit, onRetry, onRetryLast, onForwardToChat }: Props) {
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const { streamingStatus, streamingContent, statusHint } =
        useChatbotStore();

    const isStreaming =
        streamingStatus === "streaming" || streamingStatus === "connecting";
    const isThinking =
        streamingStatus === "connecting" ||
        (streamingStatus === "streaming" && streamingContent.length === 0);

    // Smart scroll: track whether user is near bottom
    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_NEAR_BOTTOM_THRESHOLD_PX;
        isNearBottomRef.current = nearBottom;
        setShowScrollDown(!nearBottom);
    }, []);

    const scrollToBottom = useCallback(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Auto-scroll only when near bottom
    useEffect(() => {
        if (isNearBottomRef.current) {
            scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length, streamingContent]);

    const handleCopy = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success("Copied");
        } catch {
            toast.error("Failed to copy");
        }
    };

    return (
        <div className="relative flex-1 overflow-hidden">
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-4 py-4 space-y-4"
        >
            {messages.map((msg, idx) => (
                <ChatbotMessageMenu
                    key={msg.id}
                    message={msg}
                    onEdit={onEdit}
                    onRetry={onRetry}
                    onForwardToChat={onForwardToChat}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                        className={cn(
                            "flex",
                            msg.role === "user"
                                ? "justify-end"
                                : "justify-start",
                        )}
                    >

                        {/* Bubble */}
                        <div
                            className={cn(
                                "max-w-[75%] group relative",
                                msg.role === "user"
                                    ? "bg-brand text-white rounded-2xl rounded-tr-md px-4 py-2.5"
                                    : "bg-muted/50 text-foreground rounded-2xl rounded-tl-md px-4 py-2.5",
                            )}
                        >
                            {msg.role === "assistant" ? (
                                <div className={MARKDOWN_CLASSES}>
                                    <Markdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeHighlight]}
                                    >
                                        {msg.content}
                                    </Markdown>
                                </div>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                    {msg.content}
                                </p>
                            )}

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {msg.attachments.map((att) => (
                                        <AttachmentPreview
                                            key={att.file_id}
                                            attachment={att}
                                            sessionId={sessionId}
                                            role={msg.role as "user" | "assistant"}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Copy button for AI messages */}
                            {msg.role === "assistant" && (
                                <div className="absolute -bottom-3 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleCopy(msg.content)}
                                        title="Copy"
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}

                            {/* Retry button on last AI message when error */}
                            {msg.role === "assistant" &&
                                streamingStatus === "error" &&
                                idx === messages.length - 1 &&
                                onRetryLast && (
                                <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-destructive/20">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                                        onClick={onRetryLast}
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        Try again
                                    </Button>
                                </div>
                            )}

                            {/* Timestamp */}
                            <p
                                className={cn(
                                    "text-[10px] mt-1",
                                    msg.role === "user"
                                        ? "text-white/60"
                                        : "text-muted-foreground/60",
                                )}
                            >
                                {new Date(msg.created_at).toLocaleTimeString(
                                    "en-US",
                                    { hour: "2-digit", minute: "2-digit" },
                                )}
                            </p>
                        </div>
                    </motion.div>
                </ChatbotMessageMenu>
            ))}

            {/* Streaming in-progress bubble */}
            {isStreaming && streamingContent.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                >
                    <div className="max-w-[75%] bg-muted/50 text-foreground rounded-2xl rounded-tl-md px-4 py-2.5">
                        <div className={MARKDOWN_CLASSES}>
                            <Markdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                            >
                                {streamingContent}
                            </Markdown>
                        </div>
                        {/* Streaming cursor */}
                        <span className="inline-block w-2 h-4 bg-brand/60 animate-pulse rounded-sm ml-0.5" />
                    </div>
                </motion.div>
            )}

            {/* Thinking indicator */}
            {isThinking && <ChatbotThinkingIndicator hint={statusHint} />}

            <div ref={scrollEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
            {showScrollDown && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2"
                >
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full shadow-md bg-background/90 backdrop-blur-sm border-border hover:bg-muted"
                        onClick={scrollToBottom}
                    >
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
        </div>
    );
}
