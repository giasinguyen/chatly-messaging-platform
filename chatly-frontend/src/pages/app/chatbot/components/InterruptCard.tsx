import { ShieldAlert, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import type { InterruptData } from "@/types/agent";

interface InterruptCardProps {
    interrupt: InterruptData;
    onApprove: () => void;
    onReject: () => void;
}

export function InterruptCard({ interrupt, onApprove, onReject }: InterruptCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const hasInput = Object.keys(interrupt.tool_input).length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex justify-start"
        >
            <div className="max-w-[75%] min-w-64 bg-muted/50 text-foreground rounded-2xl rounded-tl-md px-4 py-3 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-2">
                    <ShieldAlert className="size-4 mt-0.5 shrink-0 text-amber-500" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{interrupt.message}</p>
                        <button
                            onClick={() => setShowDetails((v) => !v)}
                            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <code className="font-mono bg-muted rounded px-1 py-0.5">
                                {interrupt.tool_name}
                            </code>
                            {hasInput && (
                                <>
                                    {showDetails
                                        ? <ChevronUp className="size-3" />
                                        : <ChevronDown className="size-3" />}
                                    <span>{showDetails ? "Hide" : "Show"} input</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Collapsible input details */}
                {showDetails && hasInput && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="rounded-lg border bg-background/60 px-3 py-2 overflow-auto max-h-48"
                    >
                        <pre className="text-xs whitespace-pre-wrap break-all text-muted-foreground">
                            {JSON.stringify(interrupt.tool_input, null, 2)}
                        </pre>
                    </motion.div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        className="h-8 gap-1.5 flex-1"
                        onClick={onApprove}
                    >
                        <Check className="size-3.5" />
                        Approve
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 flex-1"
                        onClick={onReject}
                    >
                        <X className="size-3.5" />
                        Reject
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
