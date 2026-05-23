import { useEffect, useMemo, useState } from "react";
import { Bot, MessagesSquare, MessageSquare, Plus, Search, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { agentService } from "@/services/agent.service";
import type { AgentSession } from "@/types/agent";

const NEW_SESSION_ID = "__new__";

interface ForwardToAiDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (sessionId: string | null) => Promise<void>;
}

export function ForwardToAiDialog({ open, onOpenChange, onConfirm }: ForwardToAiDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string>(NEW_SESSION_ID);
    const [sessions, setSessions] = useState<AgentSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setSelectedId(NEW_SESSION_ID);
            return;
        }

        let disposed = false;
        const fetchSessions = async () => {
            try {
                setLoading(true);
                const data = await agentService.listSessions();
                if (!disposed) setSessions(data.sessions);
            } finally {
                if (!disposed) setLoading(false);
            }
        };
        fetchSessions();
        return () => {
            disposed = true;
        };
    }, [open]);

    const filteredSessions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return sessions;
        return sessions.filter((s) => s.title.toLowerCase().includes(q));
    }, [sessions, searchQuery]);

    const handleConfirm = async () => {
        try {
            setSubmitting(true);
            await onConfirm(selectedId === NEW_SESSION_ID ? null : selectedId);
            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Send to AI Assistant</DialogTitle>
                    <DialogDescription>
                        Forward this message to an AI chat session.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search sessions..."
                        className="pl-9"
                    />
                </div>

                <ScrollArea className="max-h-80 rounded-xl border border-border/60">
                    <RadioGroup value={selectedId} onValueChange={setSelectedId}>
                        <div className="p-2 space-y-0.5">
                            {/* New session option */}
                            {!searchQuery.trim() && (
                                <label
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                                        selectedId === NEW_SESSION_ID ? "bg-brand/10" : "hover:bg-muted/60",
                                    )}
                                >
                                    <RadioGroupItem value={NEW_SESSION_ID} id={NEW_SESSION_ID} />
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border/70 bg-muted/40">
                                        <Plus className="size-4 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">
                                            New session
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Start a fresh AI conversation
                                        </p>
                                    </div>
                                </label>
                            )}

                            {loading ? (
                                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                    Loading sessions...
                                </div>
                            ) : filteredSessions.length === 0 && searchQuery.trim() ? (
                                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                    No matching sessions found.
                                </div>
                            ) : (
                                filteredSessions.map((session) => {
                                    const isGroupLinked = !!session.context_conversation_id;
                                    const Icon = isGroupLinked ? MessagesSquare : MessageSquare;
                                    return (
                                        <label
                                            key={session.id}
                                            className={cn(
                                                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                                                selectedId === session.id ? "bg-brand/10" : "hover:bg-muted/60",
                                            )}
                                        >
                                            <RadioGroupItem value={session.id} id={session.id} />
                                            <Avatar className="h-10 w-10 border border-border/50 bg-muted">
                                                <AvatarFallback className="bg-violet-500/10">
                                                    <Icon className="size-4 text-violet-500" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {session.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {isGroupLinked ? "Group-linked session" : "AI session"}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </RadioGroup>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={submitting || loading} className="gap-2">
                        {submitting ? (
                            "Sending..."
                        ) : (
                            <>
                                <Bot className="size-4" />
                                Send to AI
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
