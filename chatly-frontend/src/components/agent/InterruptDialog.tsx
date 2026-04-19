import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import type { InterruptData } from "@/types/agent";

interface InterruptDialogProps {
    interrupt: InterruptData | null;
    onApprove: () => void;
    onReject: () => void;
}

export function InterruptDialog({ interrupt, onApprove, onReject }: InterruptDialogProps) {
    const isOpen = interrupt !== null;

    return (
        <Dialog open={isOpen}>
            <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="mb-2 flex items-center gap-2">
                        <ShieldAlert className="size-5 text-amber-500" />
                        <DialogTitle>Action requires your approval</DialogTitle>
                    </div>
                    <DialogDescription>
                        {interrupt?.message ?? "The AI agent wants to perform an action."}
                    </DialogDescription>
                </DialogHeader>

                {interrupt && (
                    <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                        <p className="mb-1 font-medium text-muted-foreground">Tool</p>
                        <p className="font-mono">{interrupt.tool_name}</p>
                        {Object.keys(interrupt.tool_input).length > 0 && (
                            <>
                                <p className="mb-1 mt-2 font-medium text-muted-foreground">Input</p>
                                <pre className="overflow-auto whitespace-pre-wrap break-all text-xs">
                                    {JSON.stringify(interrupt.tool_input, null, 2)}
                                </pre>
                            </>
                        )}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onReject}>
                        Reject
                    </Button>
                    <Button onClick={onApprove}>Approve</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
