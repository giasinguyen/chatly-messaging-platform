import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
    Loader2,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { mcpService } from "@/services/mcp.service";
import { toast } from "sonner";
import type { McpServer, McpTool } from "@/types/agent";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChatConfigDialog({ open, onOpenChange }: Props) {
    const [servers, setServers] = useState<McpServer[]>([]);
    const [loading, setLoading] = useState(false);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [headerKey, setHeaderKey] = useState("");
    const [headerVal, setHeaderVal] = useState("");
    const [headers, setHeaders] = useState<Record<string, string>>({});
    const [creating, setCreating] = useState(false);

    // Tool expansion
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [tools, setTools] = useState<McpTool[]>([]);
    const [loadingTools, setLoadingTools] = useState(false);

    const loadServers = async () => {
        setLoading(true);
        try {
            const data = await mcpService.list();
            setServers(data);
        } catch {
            toast.error("Failed to load MCP servers list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) loadServers();
    }, [open]);

    const handleCreate = async () => {
        if (!name.trim() || !url.trim()) {
            toast.error("Please enter name and URL");
            return;
        }
        setCreating(true);
        try {
            const server = await mcpService.create({
                name: name.trim(),
                url: url.trim(),
                headers,
            });
            setServers((prev) => [...prev, server]);
            setName("");
            setUrl("");
            setHeaders({});
            setHeaderKey("");
            setHeaderVal("");
            setShowCreate(false);
            toast.success("MCP server added");
        } catch {
            toast.error("Failed to add MCP server");
        } finally {
            setCreating(false);
        }
    };

    const handleToggle = async (serverId: string, isActive: boolean) => {
        try {
            const updated = await mcpService.toggle(serverId, isActive);
            setServers((prev) =>
                prev.map((s) => (s.id === serverId ? updated : s)),
            );
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (serverId: string) => {
        try {
            await mcpService.delete(serverId);
            setServers((prev) => prev.filter((s) => s.id !== serverId));
            toast.success("MCP server deleted");
        } catch {
            toast.error("Failed to delete MCP server");
        }
    };

    const handleExpand = async (serverId: string) => {
        if (expandedId === serverId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(serverId);
        setLoadingTools(true);
        try {
            const data = await mcpService.listTools(serverId);
            setTools(data);
        } catch {
            setTools([]);
        } finally {
            setLoadingTools(false);
        }
    };

    const addHeader = () => {
        if (!headerKey.trim()) return;
        setHeaders((prev) => ({ ...prev, [headerKey.trim()]: headerVal }));
        setHeaderKey("");
        setHeaderVal("");
    };

    const removeHeader = (key: string) => {
        setHeaders((prev) => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>MCP Servers Configuration</DialogTitle>
                    <DialogDescription>
                        Manage MCP servers to extend AI Assistant capabilities.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-100">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-2 py-2">
                            {servers.map((server) => (
                                <div
                                    key={server.id}
                                    className="rounded-lg border border-border"
                                >
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        <button
                                            className="shrink-0 text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                                handleExpand(server.id)
                                            }
                                        >
                                            {expandedId === server.id ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {server.name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {server.url}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={server.is_active}
                                            onCheckedChange={(v) =>
                                                handleToggle(server.id, v)
                                            }
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                handleDelete(server.id)
                                            }
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    {/* Expanded: show tools */}
                                    {expandedId === server.id && (
                                        <div className="border-t border-border px-3 py-2 bg-muted/20">
                                            {loadingTools ? (
                                                <div className="flex items-center gap-2 py-2">
                                                    <span className="text-xs text-muted-foreground animate-pulse">
                                                        Loading tools...
                                                    </span>
                                                </div>
                                            ) : tools.length === 0 ? (
                                                <p className="text-xs text-muted-foreground py-2">
                                                    No tools available
                                                </p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {tools.map((tool) => (
                                                        <div
                                                            key={tool.name}
                                                            className="text-xs"
                                                        >
                                                            <p className="font-medium text-foreground">
                                                                {tool.name}
                                                            </p>
                                                            <p className="text-muted-foreground">
                                                                {
                                                                    tool.description
                                                                }
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {servers.length === 0 && (
                                <p className="text-sm text-center text-muted-foreground py-10 italic">
                                    No MCP servers yet
                                </p>
                            )}
                        </div>
                    )}

                    {/* Create form */}
                    {showCreate && (
                        <div className="border border-border rounded-lg p-3 mt-3 space-y-3">
                            <Input
                                placeholder="Server name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <Input
                                placeholder="URL (https://...)"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            {/* Headers */}
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">
                                    Headers (optional)
                                </p>
                                {Object.entries(headers).map(([k, v]) => (
                                    <div
                                        key={k}
                                        className="flex items-center gap-2 text-xs"
                                    >
                                        <span className="font-mono text-foreground">
                                            {k}: {v}
                                        </span>
                                        <button
                                            className="text-destructive hover:text-destructive/80"
                                            onClick={() => removeHeader(k)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Key"
                                        value={headerKey}
                                        onChange={(e) =>
                                            setHeaderKey(e.target.value)
                                        }
                                        className="h-8 text-xs"
                                    />
                                    <Input
                                        placeholder="Value"
                                        value={headerVal}
                                        onChange={(e) =>
                                            setHeaderVal(e.target.value)
                                        }
                                        className="h-8 text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs shrink-0"
                                        onClick={addHeader}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCreate(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCreate}
                                    disabled={creating}
                                >
                                    {creating && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    )}
                                    Create
                                </Button>
                            </div>
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    {!showCreate && (
                        <Button
                            variant="outline"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add MCP Server
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
