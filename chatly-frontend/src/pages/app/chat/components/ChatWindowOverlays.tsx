import { memo } from "react";
import { Loader2, ShieldOff, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BlockStatusResponse } from "@/types/contact";

export const DragDropOverlay = memo(function DragDropOverlay() {
    const { t } = useTranslation();
    return (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-brand m-2 rounded-xl transition-all pointer-events-none">
            <div className="flex flex-col items-center gap-4 text-brand">
                <Upload size={48} className="animate-bounce" />
                <h3 className="text-2xl font-bold tracking-tight">
                    {t("chat.drop_files")}
                </h3>
                <p className="text-muted-foreground">
                    {t("chat.drop_files_hint")}
                </p>
            </div>
        </div>
    );
});

interface TypingIndicatorProps {
    typingDisplayName: string;
    isAi?: boolean;
}

export const TypingIndicator = memo(function TypingIndicator({
    typingDisplayName,
    isAi,
}: TypingIndicatorProps) {
    const { t } = useTranslation();
    return (
        <div className="absolute bottom-24 left-6 z-10 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 bg-muted/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm">
                {isAi && <CustomAiIcon className="h-4 w-4 text-primary" />}
                <div className="flex gap-1">
                    <span
                        className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                    />
                    <span
                        className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                    />
                    <span
                        className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                    />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground italic">
                    {t("chat.typing_status", { name: typingDisplayName })}
                </span>
            </div>
        </div>
    );
});

interface BlockBannerProps {
    direction: BlockStatusResponse["direction"];
    onUnblock: () => void;
}

export const BlockedConversationBanner = memo(function BlockedConversationBanner({
    direction,
    onUnblock,
}: BlockBannerProps) {
    const { t } = useTranslation();
    return (
        <div className="border-t border-border bg-background px-6 py-4 flex items-center gap-3">
            <ShieldOff size={17} className="shrink-0 text-muted-foreground" />
            <p className="flex-1 text-sm text-muted-foreground">
                {direction === "I_BLOCKED"
                    ? t("chat.user_blocked_by_me")
                    : t("chat.user_blocked_by_them")}
            </p>
            {direction === "I_BLOCKED" && (
                <button
                    type="button"
                    onClick={onUnblock}
                    className="text-xs font-medium text-brand hover:underline shrink-0"
                >
                    {t("contact.unblock")}
                </button>
            )}
        </div>
    );
});

export const SuspendedConversationBanner = memo(function SuspendedConversationBanner() {
    const { t } = useTranslation();
    return (
        <div className="border-t border-border bg-background px-6 py-4 flex items-center gap-3">
            <ShieldOff size={17} className="shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-muted-foreground">
                {t("chat.user_suspended")}
            </p>
        </div>
    );
});

interface BlockConfirmDialogProps {
    action: "block" | "unblock" | null;
    loading: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export const BlockConfirmDialog = memo(function BlockConfirmDialog({
    action,
    loading,
    onOpenChange,
    onConfirm,
}: BlockConfirmDialogProps) {
    const { t } = useTranslation();
    return (
        <AlertDialog
            open={!!action}
            onOpenChange={(open) => !open && onOpenChange(false)}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {action === "block" ? t("chat.block_user_q") : t("chat.unblock_user_q")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {action === "block"
                            ? t("chat.block_user_desc")
                            : t("chat.unblock_user_desc")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={
                            action === "block"
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                : ""
                        }
                        disabled={loading}
                    >
                        {loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {action === "block" ? t("contact.block") : t("contact.unblock")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
});

export const ChatLoadingSkeleton = memo(function ChatLoadingSkeleton() {
    return (
        <div className="flex-1 flex flex-col bg-muted/20 p-4 sm:p-6 gap-6 overflow-hidden">
            <div className="flex w-full items-end gap-2 justify-end opacity-50">
                <div className="w-[60%] max-w-[300px] h-12 bg-brand/30 rounded-2xl rounded-br-sm animate-pulse" />
            </div>
            <div className="flex w-full items-end gap-2 justify-start opacity-50">
                <div className="w-8 h-8 rounded-full bg-border animate-pulse shrink-0" />
                <div className="w-[50%] max-w-[250px] h-16 bg-background border border-border/50 rounded-2xl rounded-bl-sm animate-pulse" />
            </div>
            <div className="flex w-full items-end gap-2 justify-start opacity-50">
                <div className="w-8 h-8 rounded-full bg-border animate-pulse shrink-0" />
                <div className="w-[40%] max-w-[200px] h-10 bg-background border border-border/50 rounded-2xl rounded-bl-sm animate-pulse" />
            </div>
            <div className="flex w-full items-end gap-2 justify-end opacity-50">
                <div className="w-[70%] max-w-[350px] h-20 bg-brand/30 rounded-2xl rounded-br-sm animate-pulse" />
            </div>
        </div>
    );
});

export const ChatNotFound = memo(function ChatNotFound() {
    const { t } = useTranslation();
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground gap-2">
            <p className="text-sm">{t("chat.conversation_not_found")}</p>
        </div>
    );
});
