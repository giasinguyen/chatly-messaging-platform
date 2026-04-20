import { type ReactNode } from "react";
import {
    Reply,
    RotateCcw,
    Pencil,
    Copy,
    Trash2,
    Pin,
    Forward,
    Star,
    AlertTriangle,
    Bot,
} from "lucide-react";
import { toast } from "sonner";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Message } from "@/types/message";
import { canEdit, canForward, canRecall } from "./messageList.utils";

interface MessageContextMenuProps {
    msg: Message;
    currentUserId: string;
    children: ReactNode;
    onReply: (msg: Message) => void;
    onForward: (msg: Message) => void;
    onForwardToAi?: (msg: Message) => void;
    onStartEdit: (msg: Message) => void;
    onRequestRecall: (messageId: string) => void;
    onRequestDelete: (messageId: string) => void;
    onTogglePin?: (messageId: string) => void;
    onTagPriority?: (messageId: string, priority: string) => void;
}

export function MessageContextMenu({
    msg,
    currentUserId,
    children,
    onReply,
    onForward,
    onForwardToAi,
    onStartEdit,
    onRequestRecall,
    onRequestDelete,
    onTogglePin,
    onTagPriority,
}: MessageContextMenuProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content);
        toast.success("Message copied");
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                {!msg.recalled && (
                    <ContextMenuItem onClick={() => onReply(msg)} className="gap-2">
                        <Reply size={14} />
                        Reply
                    </ContextMenuItem>
                )}
                {canForward(msg) && (
                    <ContextMenuItem onClick={() => onForward(msg)} className="gap-2">
                        <Forward size={14} />
                        Forward
                    </ContextMenuItem>
                )}
                {!msg.recalled && onForwardToAi && (
                    <ContextMenuItem onClick={() => onForwardToAi(msg)} className="gap-2 text-violet-600 focus:text-violet-600">
                        <Bot size={14} />
                        Ask AI
                    </ContextMenuItem>
                )}
                {msg.type === "TEXT" && !msg.recalled && (
                    <ContextMenuItem onClick={handleCopy} className="gap-2">
                        <Copy size={14} />
                        Copy message
                    </ContextMenuItem>
                )}
                {canEdit(msg, currentUserId) && (
                    <ContextMenuItem
                        onClick={() => onStartEdit(msg)}
                        className="gap-2"
                    >
                        <Pencil size={14} />
                        Edit
                    </ContextMenuItem>
                )}
                {!msg.recalled && onTogglePin && (
                    <ContextMenuItem
                        onClick={() => onTogglePin(msg.id)}
                        className="gap-2"
                    >
                        <Pin size={14} />
                        {msg.pinned ? "Unpin" : "Pin message"}
                    </ContextMenuItem>
                )}
                {!msg.recalled && onTagPriority && (
                    <>
                        <ContextMenuItem
                            onClick={() => onTagPriority(msg.id, "IMPORTANT")}
                            className="gap-2"
                        >
                            <Star size={14} />
                            {msg.priority === "IMPORTANT"
                                ? "Remove important"
                                : "Mark important"}
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={() => onTagPriority(msg.id, "URGENT")}
                            className="gap-2"
                        >
                            <AlertTriangle size={14} />
                            {msg.priority === "URGENT"
                                ? "Remove urgent"
                                : "Mark urgent"}
                        </ContextMenuItem>
                    </>
                )}
                {canRecall(msg, currentUserId) && (
                    <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            onClick={() => onRequestRecall(msg.id)}
                            className="gap-2"
                        >
                            <RotateCcw size={14} />
                            Recall
                        </ContextMenuItem>
                    </>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem
                    onClick={() => onRequestDelete(msg.id)}
                    className="gap-2 text-destructive focus:text-destructive"
                >
                    <Trash2 size={14} />
                    Delete for me
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
