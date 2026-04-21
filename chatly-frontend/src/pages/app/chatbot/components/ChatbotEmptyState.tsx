import { Sparkles, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon";
import { cn } from "@/lib/utils";

interface QuickChip {
    label: string;
    query: string;
    group?: boolean;
}

const GENERAL_CHIPS: QuickChip[] = [
    { label: "📬 Unread messages", query: "Show me my unread messages across all conversations" },
    { label: "📌 Today's reminders", query: "List all my reminders due today or upcoming" },
    { label: "👥 My groups", query: "Show me all my group conversations" },
    { label: "🔍 Search messages", query: "Search for messages containing keyword: " },
];

const GROUP_CONTEXT_CHIPS: QuickChip[] = [
    { label: "📝 Summarize this group", query: "Summarize recent activity in this group", group: true },
    { label: "❓ Unanswered questions", query: "Find unanswered questions in this group", group: true },
    { label: "📎 Files in this group", query: "List files shared in this group", group: true },
    { label: "🔔 Group reminders", query: "List all reminders in this group", group: true },
];

interface ChatbotEmptyStateProps {
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
    onChipSelect?: (query: string) => void;
    contextConversationName?: string;
}

export function ChatbotEmptyState({ sidebarCollapsed, onToggleSidebar, onChipSelect, contextConversationName }: ChatbotEmptyStateProps) {
    const hasGroupContext = !!contextConversationName;

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {sidebarCollapsed && onToggleSidebar && (
                <div className="px-4 py-3 border-b border-border shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-foreground hidden md:flex"
                        onClick={onToggleSidebar}
                        title="Show sidebar"
                    >
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                </div>
            )}
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
                {/* Icon */}
                <div className="relative">
                    <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-brand/20 to-cyan-400/20 flex items-center justify-center">
                        <CustomAiIcon className="h-14 w-14 text-brand" />
                    </div>
                    <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-cyan-400" />
                </div>

                <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground">
                        Chatly AI Assistant
                    </h2>
                    {hasGroupContext ? (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Chatting in context of{" "}
                            <span className="font-medium text-violet-500">{contextConversationName}</span>
                        </p>
                    ) : (
                        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                            Ask anything, upload documents, search the web, or use MCP tools.
                        </p>
                    )}
                </div>

                {/* Group context chips */}
                {hasGroupContext && onChipSelect && (
                    <div className="w-full max-w-md">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 text-center">
                            Group actions
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {GROUP_CONTEXT_CHIPS.map((chip) => (
                                <button
                                    key={chip.label}
                                    type="button"
                                    onClick={() => onChipSelect(chip.query)}
                                    className={cn(
                                        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer",
                                        "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20",
                                        "text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40",
                                    )}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* General chips */}
                {onChipSelect && (
                    <div className="w-full max-w-md">
                        {hasGroupContext && (
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 text-center">
                                General
                            </p>
                        )}
                        <div className="flex flex-wrap justify-center gap-2">
                            {GENERAL_CHIPS.map((chip) => (
                                <button
                                    key={chip.label}
                                    type="button"
                                    onClick={() => onChipSelect(chip.query)}
                                    className={cn(
                                        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer",
                                        "border-border bg-muted/30 text-foreground/80",
                                        "hover:bg-muted hover:text-foreground",
                                    )}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
