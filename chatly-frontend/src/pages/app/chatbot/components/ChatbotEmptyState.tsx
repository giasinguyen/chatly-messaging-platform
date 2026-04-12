import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SendHorizontal, Sparkles, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbotStore } from "@/store/chatbot.store";
import { agentService } from "@/services/agent.service";
import { toast } from "sonner";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon"

interface ChatbotEmptyStateProps {
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
}

export function ChatbotEmptyState({ sidebarCollapsed, onToggleSidebar }: ChatbotEmptyStateProps) {
    const navigate = useNavigate();
    const { addSession, setDraft } = useChatbotStore();
    const [value, setValue] = useState("");
    const [creating, setCreating] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = async () => {
        const text = value.trim();
        if (!text || creating) return;
        setCreating(true);
        try {
            const session = await agentService.createSession();
            addSession(session);
            // Pre-fill draft so ChatbotWindow sends it on mount
            setDraft(session.id, text);
            navigate(`/chatbot/${session.id}?autoSend=1`);
        } catch {
            toast.error("Không thể tạo cuộc trò chuyện mới");
        } finally {
            setCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-1 flex-col h-full">
            {/* Expand sidebar button — only shown when sidebar is collapsed */}
            {sidebarCollapsed && onToggleSidebar && (
                <div className="px-4 py-3 border-b border-border shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-foreground hidden md:flex"
                        onClick={onToggleSidebar}
                        title="Hiện sidebar"
                    >
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                </div>
            )}
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-brand/20 to-cyan-400/20 flex items-center justify-center">
                    <CustomAiIcon className="h-14 w-14 text-brand" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
                Chatly AI Assistant
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
                Nhập câu hỏi để bắt đầu trò chuyện với AI. Bạn có thể upload tài
                liệu, tìm kiếm web và sử dụng MCP tools.
            </p>

            {/* Quick-start composer */}
            <div className="w-full max-w-lg mt-2">
                <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/30 p-2 focus-within:ring-2 focus-within:ring-brand/40 transition-shadow">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Hỏi AI bất kỳ điều gì..."
                        rows={1}
                        className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-32 min-h-9 py-2 px-2"
                    />
                    <Button
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-lg bg-brand text-white hover:bg-brand/90"
                        disabled={!value.trim() || creating}
                        onClick={handleSubmit}
                    >
                        <SendHorizontal className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            </div>
        </div>
    );
}
