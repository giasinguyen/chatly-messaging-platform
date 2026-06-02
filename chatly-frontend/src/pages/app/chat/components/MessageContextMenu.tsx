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
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content);
        toast.success(t("chat.message_copied"));
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                {!msg.recalled && (
                    <ContextMenuItem onClick={() => onReply(msg)} className="gap-2">
                        <Reply size={14} />
                        {t("chat.reply")}
                    </ContextMenuItem>
                )}
                {canForward(msg) && (
                    <ContextMenuItem onClick={() => onForward(msg)} className="gap-2">
                        <Forward size={14} />
                        {t("chat.forward")}
                    </ContextMenuItem>
                )}
                {!msg.recalled && onForwardToAi && (
                    <ContextMenuItem onClick={() => onForwardToAi(msg)} className="gap-2 text-violet-600 focus:text-violet-600">
                        <Bot size={14} />
                        {t("chat.forward_to_ai")}
                    </ContextMenuItem>
                )}
                {(msg.type === "TEXT" || msg.type === "AGENT") && !msg.recalled && (
                    <ContextMenuItem onClick={handleCopy} className="gap-2">
                        <Copy size={14} />
                        {t("chat.copy_message")}
                    </ContextMenuItem>
                )}
                {canEdit(msg, currentUserId) && (
                    <ContextMenuItem
                        onClick={() => onStartEdit(msg)}
                        className="gap-2"
                    >
                        <Pencil size={14} />
                        {t("common.edit")}
                    </ContextMenuItem>
                )}
                {!msg.recalled && onTogglePin && (
                    <ContextMenuItem
                        onClick={() => onTogglePin(msg.id)}
                        className="gap-2"
                    >
                        <Pin size={14} />
                        {msg.pinned ? t("chat.unpin") : t("chat.pin_message")}
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
                                ? t("chat.remove_important")
                                : t("chat.mark_important")}
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={() => onTagPriority(msg.id, "URGENT")}
                            className="gap-2"
                        >
                            <AlertTriangle size={14} />
                            {msg.priority === "URGENT"
                                ? t("chat.remove_urgent")
                                : t("chat.mark_urgent")}
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
                            {t("chat.recall")}
                        </ContextMenuItem>
                    </>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem
                    onClick={() => onRequestDelete(msg.id)}
                    className="gap-2 text-destructive focus:text-destructive"
                >
                    <Trash2 size={14} />
                    {t("chat.delete_for_me")}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
