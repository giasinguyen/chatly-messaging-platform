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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground md:gap-x-8">
            <p>
                <span className="font-semibold">{postCount}</span> posts
            </p>
            <button
                type="button"
                className="transition-opacity hover:opacity-70"
                onClick={onOpenFriends}
            >
                <span className="font-semibold">{friendCount}</span> friends
            </button>
        </div>
    );
}
