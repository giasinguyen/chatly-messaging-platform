import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomAiIcon } from "@/components/customize/CustomAiIcon";

interface CoAuthorAvatarProps {
    userAvatarUrl?: string;
    userDisplayName: string;
    onClick?: () => void;
}

/**
 * Overlapping dual-avatar for AI co-authored messages.
 * Shows a primary user avatar with a secondary AI avatar peeking behind.
 */
export function CoAuthorAvatar({ userAvatarUrl, userDisplayName, onClick }: CoAuthorAvatarProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="relative h-8 w-8 shrink-0 overflow-visible"
            title={`${userDisplayName} + AI`}
        >
            <span className="absolute left-3 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-muted/40 ring-2 ring-background">
                <CustomAiIcon className="h-5 w-5 text-primary/90" />
            </span>

            <Avatar className="absolute -left-1 top-0 h-8 w-8 border border-border/50 ring-2 ring-background">
                <AvatarImage src={userAvatarUrl} />
                <AvatarFallback>{userDisplayName.charAt(0)}</AvatarFallback>
            </Avatar>
        </button>
    );
}
