import {
    Check,
    Loader2,
    UserMinus,
    UserPlus,
    ChevronDown,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { followService } from "@/services/follow.service";
import { useFollowStore } from "@/store/follow.store";
import { toast } from "sonner";

interface FollowButtonProps {
    userId: string;
    initialIsFollowing?: boolean;
}

export function FollowButton({ userId, initialIsFollowing = false }: FollowButtonProps) {
    const [loading, setLoading] = useState(false);
    const isFollowing = useFollowStore((s) => s.isFollowing(userId));
    const setFollowing = useFollowStore((s) => s.setFollowing);

    const handleFollow = useCallback(async () => {
        setLoading(true);
        try {
            // Optimistic update
            setFollowing(userId, true);

            await followService.follow(userId);
            toast.success("Following");
        } catch (error) {
            // Rollback on error
            setFollowing(userId, false);
            const msg =
                error instanceof Error
                    ? error.message
                    : "Failed to follow user";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [userId, setFollowing]);

    const handleUnfollow = useCallback(async () => {
        setLoading(true);
        try {
            // Optimistic update
            setFollowing(userId, false);

            await followService.unfollow(userId);
            toast.success("Unfollowed");
        } catch (error) {
            // Rollback on error
            setFollowing(userId, true);
            const msg =
                error instanceof Error
                    ? error.message
                    : "Failed to unfollow user";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [userId, setFollowing]);

    const displayFollowing = initialIsFollowing ? !isFollowing : isFollowing;

    if (displayFollowing) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="default"
                        size="sm"
                        disabled={loading}
                        className="gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        Following
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={handleUnfollow}
                        disabled={loading}
                        className="text-destructive"
                    >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Unfollow
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleFollow}
            disabled={loading}
            className="gap-2"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <UserPlus className="h-4 w-4" />
            )}
            Follow
        </Button>
    );
}
