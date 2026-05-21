interface ProfileStatsProps {
    postCount: number;
    friendCount: number;
    onOpenFriends: () => void;
}

export function ProfileStats({
    postCount,
    friendCount,
    onOpenFriends,
}: ProfileStatsProps) {
    return (
        <div className="my-3 flex items-center gap-6">
            <div>
                <div className="text-base font-semibold text-foreground">{postCount}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <button
                type="button"
                className="text-left transition-opacity hover:opacity-70"
                onClick={onOpenFriends}
            >
                <div className="text-base font-semibold text-foreground">{friendCount}</div>
                <div className="text-xs text-muted-foreground">Friends</div>
            </button>
        </div>
    );
}
