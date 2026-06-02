import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
    return (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground md:gap-x-8">
            <p>{t("profile.posts_count", { count: postCount })}</p>
            <button
                type="button"
                className="transition-opacity hover:opacity-70"
                onClick={onOpenFriends}
            >
                {t("profile.friends_count", { count: friendCount })}
            </button>
        </div>
    );
}
