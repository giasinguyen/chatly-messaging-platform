import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ReportReason } from "@/types/post";
import type { CreateUserReportRequest } from "@/types/userReport";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
    { value: "SPAM", label: "Spam" },
    { value: "HARASSMENT", label: "Harassment" },
    { value: "INAPPROPRIATE", label: "Inappropriate" },
    { value: "OTHER", label: "Other" },
];

interface ReportUserDialogProps {
    open: boolean;
    displayName: string;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateUserReportRequest) => void | Promise<void>;
}

export function ReportUserDialog({
    open,
    displayName,
    isSubmitting,
    onOpenChange,
    onSubmit,
}: ReportUserDialogProps) {
    const [reason, setReason] = useState<ReportReason>("SPAM");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (!open) {
            setReason("SPAM");
            setDescription("");
        }
    }, [open]);

    const handleSubmit = () => {
        void onSubmit({
            reason,
            description: description.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <Flag className="size-5" />
                    </div>
                    <DialogTitle>Report {displayName}</DialogTitle>
                    <DialogDescription>
                        Select a reason and add context for the moderation team.
                    </DialogDescription>
                </DialogHeader>

                <RadioGroup
                    value={reason}
                    onValueChange={(value) => setReason(value as ReportReason)}
                    className="grid gap-2"
                >
                    {REPORT_REASONS.map((item) => (
                        <Label
                            key={item.value}
                            htmlFor={`chat-report-user-${item.value}`}
                            className="cursor-pointer gap-3 rounded-xl border border-border px-3 py-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                        >
                            <RadioGroupItem id={`chat-report-user-${item.value}`} value={item.value} />
                            <span>{item.label}</span>
                        </Label>
                    ))}
                </RadioGroup>

                <div className="space-y-2">
                    <Label htmlFor="chat-report-user-description">Description</Label>
                    <Textarea
                        id="chat-report-user-description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Add details for review..."
                        rows={4}
                        maxLength={500}
                        disabled={isSubmitting}
                    />
                    <p className="text-right text-xs text-muted-foreground">{description.length}/500</p>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit report"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
