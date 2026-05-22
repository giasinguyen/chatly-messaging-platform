import { CustomAiIcon } from "@/components/customize/CustomAiIcon";
import { cn } from "@/lib/utils";
import type { MentionDropdownAnchor, MentionSuggestion } from "@/utils/mention";

interface MentionSuggestionsDropdownProps {
    suggestions: MentionSuggestion[];
    activeIndex: number;
    onSelect: (suggestion: MentionSuggestion) => void;
    className?: string;
    placement?: "top" | "bottom";
    anchor?: MentionDropdownAnchor | null;
}

export function MentionSuggestionsDropdown({
    suggestions,
    activeIndex,
    onSelect,
    className,
    placement = "top",
    anchor,
}: MentionSuggestionsDropdownProps) {
    if (!suggestions.length) {
        return null;
    }

    return (
        <div
            className={cn(
                !anchor && placement === "bottom"
                    ? "absolute top-full left-0 mt-1"
                    : !anchor && "absolute bottom-full left-0 mb-1",
                anchor && "absolute",
                anchor?.placement === "top" && "-translate-y-full",
                "w-72 max-h-52 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50",
                className,
            )}
            style={
                anchor
                    ? {
                        left: anchor.left,
                        top: anchor.top,
                        maxHeight: anchor.maxHeight,
                    }
                    : undefined
            }
        >
            {suggestions.map((suggestion, index) => (
                <button
                    key={`${suggestion.kind}-${suggestion.id}`}
                    type="button"
                    className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                        index === activeIndex && "bg-accent",
                    )}
                    onMouseDown={(event) => {
                        event.preventDefault();
                        onSelect(suggestion);
                    }}
                >
                    <div
                        className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden",
                            suggestion.kind === "ai"
                                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                                : "bg-brand/20 text-brand",
                        )}
                    >
                        {suggestion.kind === "all" && "@"}
                        {suggestion.kind === "ai" && <CustomAiIcon className="w-4 h-4" />}
                        {suggestion.kind === "user" && suggestion.avatarUrl && (
                            <img
                                src={suggestion.avatarUrl}
                                alt={suggestion.displayName}
                                className="h-full w-full object-cover"
                            />
                        )}
                        {suggestion.kind === "user" && !suggestion.avatarUrl &&
                            suggestion.displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <p className="font-medium truncate">
                            {suggestion.kind === "ai" ? "@AI" : suggestion.kind === "all" ? "@all" : suggestion.displayName}
                        </p>
                        {suggestion.kind === "user" && (
                            <p className="text-xs text-muted-foreground truncate">@{suggestion.username}</p>
                        )}
                        {suggestion.kind === "ai" && (
                            <p className="text-xs text-muted-foreground truncate">AI assistant</p>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}
