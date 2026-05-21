import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import type { ReportPostRequest, ReportReason } from "@/types/post";

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
    { value: "SPAM", label: "Spam", description: "Scams, repeated posts, or unwanted promotion." },
    { value: "HARASSMENT", label: "Harassment", description: "Bullying, threats, or targeted abuse." },
    { value: "INAPPROPRIATE", label: "Inappropriate", description: "Nudity, violence, hate, or unsafe content." },
    { value: "OTHER", label: "Other", description: "Something else that should be reviewed." },
];

interface ReportPostDialogProps {
    open: boolean;
    isSubmitting?: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: ReportPostRequest) => void | Promise<void>;
}

export function ReportPostDialog({
    open,
    isSubmitting = false,
    onOpenChange,
    onSubmit,
}: ReportPostDialogProps) {
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
                    <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                        <AlertTriangle className="size-5" />
                    </div>
                    <DialogTitle>Report post</DialogTitle>
                    <DialogDescription>
                        Choose a reason and add any context that can help moderation review this post.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <RadioGroup
                        value={reason}
                        onValueChange={(value) => setReason(value as ReportReason)}
                        className="gap-2"
                    >
                        {REPORT_REASONS.map((item) => (
                            <Label
                                key={item.value}
                                htmlFor={`report-${item.value}`}
                                className="cursor-pointer items-start gap-3 rounded-2xl border border-border px-3 py-3 transition hover:bg-muted/60 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                            >
                                <RadioGroupItem
                                    id={`report-${item.value}`}
                                    value={item.value}
                                    className="mt-0.5"
                                />
                                <span className="grid gap-1">
                                    <span className="font-medium text-foreground">{item.label}</span>
                                    <span className="text-xs font-normal leading-relaxed text-muted-foreground">
                                        {item.description}
                                    </span>
                                </span>
                            </Label>
                        ))}
                    </RadioGroup>

                    <div className="space-y-2">
                        <Label htmlFor="report-description">Description</Label>
                        <Textarea
                            id="report-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="Add details for the moderation team..."
                            rows={4}
                            maxLength={500}
                            className="resize-none"
                            disabled={isSubmitting}
                        />
                        <p className="text-right text-xs text-muted-foreground">
                            {description.length}/500
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Submitting..." : "Submit report"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
