import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    return (
        <>
            <Dialog
                open={!!recallConfirmId}
                onOpenChange={(open) => !open && onCancelRecall()}
            >
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Recall message?</DialogTitle>
                        <DialogDescription>
                            The message will be recalled for everyone in the
                            conversation. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={onCancelRecall}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (recallConfirmId) onConfirmRecall(recallConfirmId);
                            }}
                        >
                            Recall
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
                        <DialogTitle>Delete message?</DialogTitle>
                        <DialogDescription>
                            The message will be deleted from your view. Others will
                            still see it. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={onCancelDelete}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteConfirmId) onConfirmDelete(deleteConfirmId);
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
