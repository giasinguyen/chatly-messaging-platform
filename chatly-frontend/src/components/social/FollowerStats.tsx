import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { followService } from "@/services/follow.service";
import type { UserSocialStats } from "@/types/follow";
import { formatCount } from "@/utils/format";
import { toast } from "sonner";

interface FollowerStatsProps {
    userId: string;
}

export function FollowerStats({ userId }: FollowerStatsProps) {
    const [stats, setStats] = useState<UserSocialStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const response = await followService.getStats(userId);
                if (response.code === 1000 && response.result) {
                    setStats(response.result);
                }
            } catch (error) {
                const msg =
                    error instanceof Error
                        ? error.message
                        : "Failed to load stats";
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchStats();
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    return (
        <div className="flex gap-6">
            <div className="flex flex-col items-center gap-1">
                <div className="font-semibold">{formatCount(stats.followers)}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <div className="font-semibold">{formatCount(stats.following)}</div>
                <div className="text-xs text-muted-foreground">Following</div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <div className="font-semibold">{formatCount(stats.posts)}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
            </div>
        </div>
    );
}
