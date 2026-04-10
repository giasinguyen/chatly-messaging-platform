import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Settings, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useChatbotStore } from "@/store/chatbot.store";
import { agentService } from "@/services/agent.service";
import { ChatConfigDialog } from "./ChatConfigDialog";
import { toast } from "sonner";

interface Props {
    activeSessionId?: string;
}

export function ChatbotSessionSidebar({ activeSessionId }: Props) {
    const navigate = useNavigate();
    const { sessions, setSessions, addSession, removeSession } =
        useChatbotStore();
    const [loading, setLoading] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);

    // Bootstrap sessions
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const data = await agentService.listSessions();
                if (!cancelled) setSessions(data.sessions);
            } catch {
                toast.error("Không thể tải danh sách chat");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [setSessions]);

    const handleCreate = async () => {
        try {
            const session = await agentService.createSession();
            addSession(session);
            navigate(`/chatbot/${session.id}`);
        } catch {
            toast.error("Không thể tạo cuộc trò chuyện mới");
        }
    };

    const handleDelete = async (
        e: React.MouseEvent,
        sessionId: string,
    ) => {
        e.stopPropagation();
        try {
            await agentService.deleteSession(sessionId);
            removeSession(sessionId);
            if (activeSessionId === sessionId) {
                navigate("/chatbot");
            }
            toast.success("Đã xóa cuộc trò chuyện");
        } catch {
            toast.error("Không thể xóa cuộc trò chuyện");
        }
    };

    return (
        <div className="w-full md:w-80 h-full border-r border-border flex flex-col bg-background">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold text-foreground">
                    AI Chat
                </h2>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setConfigOpen(true)}
                        title="Cấu hình MCP"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-brand hover:text-brand/80"
                        onClick={handleCreate}
                        title="Tạo cuộc trò chuyện mới"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Session list */}
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <span className="text-sm text-muted-foreground">
                            Đang tải...
                        </span>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            Chưa có cuộc trò chuyện nào
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCreate}
                        >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Tạo mới
                        </Button>
                    </div>
                ) : (
                    <div className="py-1">
                        {sessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() =>
                                    navigate(`/chatbot/${session.id}`)
                                }
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group",
                                    session.id === activeSessionId
                                        ? "bg-brand/8 border-r-2 border-brand"
                                        : "hover:bg-muted/50",
                                )}
                            >
                                <MessageSquare
                                    className={cn(
                                        "h-4 w-4 shrink-0",
                                        session.id === activeSessionId
                                            ? "text-brand"
                                            : "text-muted-foreground",
                                    )}
                                />
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={cn(
                                            "text-sm truncate",
                                            session.id === activeSessionId
                                                ? "font-medium text-foreground"
                                                : "text-foreground/80",
                                        )}
                                    >
                                        {session.title}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {new Date(
                                            session.created_at,
                                        ).toLocaleDateString("vi-VN")}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                    onClick={(e) =>
                                        handleDelete(e, session.id)
                                    }
                                    title="Xóa"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Chat Config Dialog */}
            <ChatConfigDialog
                open={configOpen}
                onOpenChange={setConfigOpen}
            />
        </div>
    );
}
