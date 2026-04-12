import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Settings,
    Trash2,
    MessageSquare,
    Pencil,
    Check,
    X,
    PanelLeftClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useChatbotStore } from "@/store/chatbot.store";
import { agentService } from "@/services/agent.service";
import { ChatConfigDialog } from "./ChatConfigDialog";
import { toast } from "sonner";

interface Props {
    activeSessionId?: string;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function ChatbotSessionSidebar({ activeSessionId, onToggleCollapse }: Props) {
    const navigate = useNavigate();
    const { sessions, setSessions, addSession, removeSession, renameSession } =
        useChatbotStore();
    const [loading, setLoading] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);

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

    // Focus input when editing starts
    useEffect(() => {
        if (editingId) editInputRef.current?.focus();
    }, [editingId]);

    const handleCreate = () => {
        navigate("/chatbot");
    };

    const handleDelete = async (sessionId: string) => {
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

    const startRename = (e: React.MouseEvent, sessionId: string, title: string) => {
        e.stopPropagation();
        setEditingId(sessionId);
        setEditTitle(title);
    };

    const confirmRename = async () => {
        if (!editingId || !editTitle.trim()) return;
        try {
            await agentService.renameSession(editingId, editTitle.trim());
            renameSession(editingId, editTitle.trim());
        } catch {
            toast.error("Không thể đổi tên cuộc trò chuyện");
        } finally {
            setEditingId(null);
        }
    };

    const cancelRename = () => setEditingId(null);

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
                    {onToggleCollapse && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hidden md:flex"
                            onClick={onToggleCollapse}
                            title="Ẩn sidebar"
                        >
                            <PanelLeftClose className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Session list */}
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="py-2 space-y-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                                <Skeleton className="h-4 w-4 rounded" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-3/4" />
                                    <Skeleton className="h-2.5 w-1/3" />
                                </div>
                            </div>
                        ))}
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
                        {sessions.map((session) => {
                            const isEditing = editingId === session.id;
                            const isActive = session.id === activeSessionId;
                            return (
                                <div
                                    key={session.id}
                                    onClick={() => {
                                        if (!isEditing) navigate(`/chatbot/${session.id}`);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group cursor-pointer",
                                        isActive
                                            ? "bg-brand/8 border-r-2 border-brand"
                                            : "hover:bg-muted/50",
                                    )}
                                >
                                    <MessageSquare
                                        className={cn(
                                            "h-4 w-4 shrink-0",
                                            isActive ? "text-brand" : "text-muted-foreground",
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <form
                                                className="flex items-center gap-1"
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    confirmRename();
                                                }}
                                            >
                                                <input
                                                    ref={editInputRef}
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") cancelRename();
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-sm w-full bg-transparent border-b border-brand outline-none py-0.5"
                                                />
                                                <Button
                                                    type="submit"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0 text-brand"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0 text-muted-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        cancelRename();
                                                    }}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </form>
                                        ) : (
                                            <>
                                                <p
                                                    className={cn(
                                                        "text-sm truncate",
                                                        isActive
                                                            ? "font-medium text-foreground"
                                                            : "text-foreground/80",
                                                    )}
                                                >
                                                    {session.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {new Date(session.created_at).toLocaleDateString("vi-VN")}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    {!isEditing && (
                                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                onClick={(e) => startRename(e, session.id, session.title)}
                                                title="Đổi tên"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Xóa cuộc trò chuyện?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Cuộc trò chuyện &ldquo;{session.title}&rdquo; sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={() => handleDelete(session.id)}
                                                        >
                                                            Xóa
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
