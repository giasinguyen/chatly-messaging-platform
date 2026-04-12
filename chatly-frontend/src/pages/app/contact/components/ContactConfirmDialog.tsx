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

function getContent(action: ConfirmAction | null) {
    if (!action) return null;
    if (action.type === "unblock") {
        return {
            title: "Unblock user?",
            description: `${action.name} will be able to send you friend requests and messages again. You will be restored as friends.`,
            actionLabel: "Unblock",
            actionClass: "bg-primary",
        };
    }
    if (action.type === "block") {
        return {
            title: "Block user?",
            description: `${action.name} will no longer be able to message you or view your full profile. Your friendship will be frozen.`,
            actionLabel: "Block",
            actionClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        };
    }
    return {
        title: "Remove friend?",
        description: `Are you sure you want to remove ${action.name} from your friends? You'll need to send a new request to reconnect.`,
        actionLabel: "Remove",
        actionClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    };
}

export function ContactConfirmDialog({ confirmAction, onConfirm, onClose }: ContactConfirmDialogProps) {
    const content = getContent(confirmAction);

    return (
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{content?.title}</AlertDialogTitle>
                    <AlertDialogDescription>{content?.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className={content?.actionClass}>
                        {content?.actionLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
