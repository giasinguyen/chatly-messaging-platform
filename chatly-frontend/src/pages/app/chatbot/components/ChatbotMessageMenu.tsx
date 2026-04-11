import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AgentMessage } from "@/types/agent";

interface Props {
    message: AgentMessage;
    children: React.ReactNode;
    onEdit?: (message: AgentMessage) => void;
    onRetry?: (message: AgentMessage) => void;
    onDelete?: (message: AgentMessage) => void;
}

export function ChatbotMessageMenu({
    message,
    children,
    onEdit,
    onRetry,
    onDelete,
}: Props) {
    const isUser = message.role === "user";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            toast.success("Đã copy");
        } catch {
            toast.error("Không thể copy");
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                </ContextMenuItem>
                {isUser && onEdit && (
                    <ContextMenuItem onClick={() => onEdit(message)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Sửa & gửi lại
                    </ContextMenuItem>
                )}
                {isUser && onRetry && (
                    <ContextMenuItem onClick={() => onRetry(message)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Gửi lại
                    </ContextMenuItem>
                )}
                {onDelete && (
                    <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(message)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
