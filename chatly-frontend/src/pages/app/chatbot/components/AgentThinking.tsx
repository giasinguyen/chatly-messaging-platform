import { Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react";
import type { ToolCallState } from "@/types/agent";

interface AgentThinkingProps {
    toolCalls: ToolCallState[];
}

const STATUS_ICON: Record<ToolCallState["status"], React.ReactNode> = {
    running: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
    done: <CheckCircle2 className="size-4 text-green-500" />,
    cancelled: <XCircle className="size-4 text-destructive" />,
};

export function AgentThinking({ toolCalls }: AgentThinkingProps) {
    if (toolCalls.length === 0) return null;

    return (
        <div className="flex flex-col gap-1.5 py-2">
            {toolCalls.map((tc, idx) => (
                <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
                >
                    <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">{tc.tool}</span>
                    {STATUS_ICON[tc.status]}
                </div>
            ))}
        </div>
    );
}
