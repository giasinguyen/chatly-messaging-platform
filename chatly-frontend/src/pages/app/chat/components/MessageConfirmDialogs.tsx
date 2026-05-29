import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface MessageConfirmDialogsProps {
    recallConfirmId: string | null;
    deleteConfirmId: string | null;
    onCancelRecall: () => void;
    onCancelDelete: () => void;
    onConfirmRecall: (id: string) => void;
    onConfirmDelete: (id: string) => void;
}

export function MessageConfirmDialogs({
    recallConfirmId,
    deleteConfirmId,
    onCancelRecall,
    onCancelDelete,
    onConfirmRecall,
    onConfirmDelete,
}: MessageConfirmDialogsProps) {
    const { t } = useTranslation();

    return (
        <>
            <Dialog
                open={!!recallConfirmId}
                onOpenChange={(open) => !open && onCancelRecall()}
            >
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>{t("chat.recall_message_title")}</DialogTitle>
                        <DialogDescription>
                            {t("chat.recall_message_description")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={onCancelRecall}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (recallConfirmId) onConfirmRecall(recallConfirmId);
                            }}
                        >
                            {t("chat.recall")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!deleteConfirmId}
                onOpenChange={(open) => !open && onCancelDelete()}
            >
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>{t("chat.delete_message_title")}</DialogTitle>
                        <DialogDescription>
                            {t("chat.delete_message_description")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={onCancelDelete}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteConfirmId) onConfirmDelete(deleteConfirmId);
                            }}
                        >
                            {t("common.delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
