import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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

export type ConfirmAction =
    | { type: "unblock"; contactId: string; name: string }
    | { type: "block"; contactId: string; name: string }
    | { type: "remove"; contactId: string; name: string };

interface ContactConfirmDialogProps {
    confirmAction: ConfirmAction | null;
    onConfirm: () => void;
    onClose: () => void;
}

function getContent(action: ConfirmAction | null, t: TFunction) {
    if (!action) return null;
    if (action.type === "unblock") {
        return {
            title: t("contact.confirm.unblock_title"),
            description: t("contact.confirm.unblock_desc", { name: action.name }),
            actionLabel: t("contact.confirm.unblock_action"),
            actionClass: "bg-primary",
        };
    }
    if (action.type === "block") {
        return {
            title: t("contact.confirm.block_title"),
            description: t("contact.confirm.block_desc", { name: action.name }),
            actionLabel: t("contact.confirm.block_action"),
            actionClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        };
    }
    return {
        title: t("contact.confirm.remove_title"),
        description: t("contact.confirm.remove_desc", { name: action.name }),
        actionLabel: t("contact.confirm.remove_action"),
        actionClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    };
}

export function ContactConfirmDialog({ confirmAction, onConfirm, onClose }: ContactConfirmDialogProps) {
    const { t } = useTranslation();
    const content = getContent(confirmAction, t);

    return (
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{content?.title}</AlertDialogTitle>
                    <AlertDialogDescription>{content?.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className={content?.actionClass}>
                        {content?.actionLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
