import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminBadgeProps {
    className?: string;
    showTooltip?: boolean;
}

const ADMIN_BADGE_TOOLTIP =
    "This user has been verified by a Chatly administrator.";

/**
 * Blue verified badge shown next to ADMIN users, similar to Facebook's verified tick.
 */
export function AdminBadge({ className, showTooltip = true }: AdminBadgeProps) {
    const icon = (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-label="Admin"
            role="img"
            className={cn("inline-block shrink-0 size-4 text-[#1877F2]", className)}
            fill="currentColor"
        >
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-4-4 1.41-1.41L11 12.17l6.59-6.59L19 7l-8 8z" />
        </svg>
    );

    if (!showTooltip) {
        return icon;
    }

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0 align-middle">
                        {icon}
                    </span>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="max-w-56 text-center leading-snug"
                >
                    {ADMIN_BADGE_TOOLTIP}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
