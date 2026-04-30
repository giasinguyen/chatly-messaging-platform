import { AxiosError } from "axios";
import { Check, Loader2, UserMinus, UserPlus, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { followService } from "@/services/follow.service";
import { useFollowStore } from "@/store/follow.store";
import { toast } from "sonner";

interface FollowButtonProps {
    userId: string;
    initialIsFollowing?: boolean;
}

export function FollowButton({ userId, initialIsFollowing = false }: FollowButtonProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isFollowing = useFollowStore((s) => s.isFollowing(userId));
    const setFollowing = useFollowStore((s) => s.setFollowing);

    useEffect(() => {
        if (initialIsFollowing !== undefined) {
            setFollowing(userId, initialIsFollowing);
        }
    }, [userId, initialIsFollowing, setFollowing]);

    useEffect(() => {
        if (!open) return;

        const handler = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleFollow = useCallback(async () => {
        setLoading(true);
        try {
            setFollowing(userId, true);
            await followService.follow(userId);
            toast.success("Following");
        } catch (error) {
            const status = error instanceof AxiosError ? error.response?.status : undefined;

            if (status === 409) {
                setFollowing(userId, true);
                toast.info("You are already following this user");
            } else {
                setFollowing(userId, false);
                toast.error(error instanceof Error ? error.message : "Failed to follow");
            }
        } finally {
            setLoading(false);
        }
    }, [userId, setFollowing]);

    const handleUnfollow = useCallback(async () => {
        setLoading(true);
        try {
            setFollowing(userId, false);
            await followService.unfollow(userId);
            toast.success("Unfollowed");
        } catch (error) {
            const status = error instanceof AxiosError ? error.response?.status : undefined;

            if (status === 404) {
                setFollowing(userId, false);
                toast.info("You are not following this user");
            } else {
                setFollowing(userId, true);
                toast.error(error instanceof Error ? error.message : "Failed to unfollow");
            }
        } finally {
            setLoading(false);
        }
    }, [userId, setFollowing]);

    if (isFollowing) {
        return (
            <div ref={menuRef} className="relative inline-block">
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => setOpen((value) => !value)}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Following
                    <ChevronDown className="h-3 w-3" />
                </button>

                {open && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                        <button
                            type="button"
                            disabled={loading}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                setOpen(false);
                                void handleUnfollow();
                            }}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                        >
                            <UserMinus className="h-4 w-4" />
                            Unfollow
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => void handleFollow()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Follow
        </button>
    );
}
