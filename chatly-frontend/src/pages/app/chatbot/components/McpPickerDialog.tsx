import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { mcpService } from "@/services/mcp.service";
import { useChatbotStore } from "@/store/chatbot.store";
import type { McpServer } from "@/types/agent";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function McpPickerDialog({ open, onOpenChange }: Props) {
    const { selectedMcpIds, setSelectedMcpIds } = useChatbotStore();
    const [servers, setServers] = useState<McpServer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const data = await mcpService.list();
                if (!cancelled) setServers(data.filter((s) => s.is_active));
            } catch {
                // silently fail
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [open]);

    const toggle = (serverId: string) => {
        setSelectedMcpIds(
            selectedMcpIds.includes(serverId)
                ? selectedMcpIds.filter((id) => id !== serverId)
                : [...selectedMcpIds, serverId],
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Select MCP Servers</DialogTitle>
                    <DialogDescription>
                        Select MCP servers to use for your next question.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : servers.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-8">
                        No MCP servers available. Add them in chat configuration.
                    </p>
                ) : (
                    <ScrollArea className="max-h-80">
                        <div className="space-y-2 py-2">
                            {servers.map((server) => (
                                <label
                                    key={server.id}
                                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                                >
                                    <Checkbox
                                        checked={selectedMcpIds.includes(
                                            server.id,
                                        )}
                                        onCheckedChange={() =>
                                            toggle(server.id)
                                        }
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {server.name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {server.url}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}
