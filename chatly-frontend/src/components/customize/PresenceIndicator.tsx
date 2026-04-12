import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
    status?: "ONLINE" | "OFFLINE" | string;
    lastSeen?: string | null;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    className?: string;
}

function formatLastSeen(lastSeen: string | null | undefined): string {
    if (!lastSeen) return "";
    const date = new Date(lastSeen);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

const DOT_SIZES = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
};

export function PresenceIndicator({
    status,
    lastSeen,
    size = "md",
    showLabel = false,
    className,
}: PresenceIndicatorProps) {
    const isOnline = status === "ONLINE";

    return (
        <span className={cn("inline-flex items-center gap-1.5", className)}>
            <span
                className={cn(
                    "rounded-full shrink-0 ring-2 ring-background",
                    DOT_SIZES[size],
                    isOnline ? "bg-green-500" : "bg-gray-400",
                )}
            />
            {showLabel && (
                <span className="text-xs text-muted-foreground">
                    {isOnline
                        ? "Online"
                        : lastSeen
                          ? formatLastSeen(lastSeen)
                          : "Offline"}
                </span>
            )}
        </span>
    );
}
