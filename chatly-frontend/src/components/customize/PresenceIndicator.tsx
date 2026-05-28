import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
    status?: "ONLINE" | "OFFLINE" | string;
    lastSeen?: string | null;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    className?: string;
}

function formatLastSeen(lastSeen: string | null | undefined, t: TFunction, locale: string): string {
    if (!lastSeen) return "";
    const date = new Date(lastSeen);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("common.just_now");
    if (diffMins < 60) return t("notifications.time_m_ago", { count: diffMins });
    if (diffHours < 24) return t("notifications.time_h_ago", { count: diffHours });
    if (diffDays < 7) return t("notifications.time_d_ago", { count: diffDays });

    return new Intl.DateTimeFormat(locale, {
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
    const { t, i18n } = useTranslation();
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
                        ? t("common.online")
                        : lastSeen
                          ? formatLastSeen(lastSeen, t, i18n.language)
                          : t("common.offline")}
                </span>
            )}
        </span>
    );
}
