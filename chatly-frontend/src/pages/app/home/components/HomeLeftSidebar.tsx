import { useEffect, useState } from "react";
import { Hash, Loader2, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { postService } from "@/services/post.service";
import type { TrendingHashtag } from "@/types/post";

const HOME_TRENDING_HASHTAG_LIMIT = 5;

export function HomeLeftSidebar() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>(
        [],
    );
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadTrendingHashtags = async () => {
            setIsLoading(true);
            try {
                const response = await postService.getTrendingHashtags(
                    HOME_TRENDING_HASHTAG_LIMIT,
                );
                if (response.code !== 1000 || !response.result) {
                    setTrendingHashtags([]);
                    return;
                }
                setTrendingHashtags(response.result);
            } catch {
                setTrendingHashtags([]);
            } finally {
                setIsLoading(false);
            }
        };

        void loadTrendingHashtags();
    }, []);

    return (
        <aside className="sticky top-0 hidden h-screen w-100 shrink-0 overflow-y-auto px-8 pt-8 xl:block hide-scrollbar">
            <section className="rounded-2xl border border-border bg-card p-5 iv-shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                    <TrendingUp className="size-4 text-[#1a146b]" />
                    <h2 className="text-sm font-semibold text-foreground">
                        {t("home.trending_title")}
                    </h2>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                    {t("home.trending_subtitle")}
                </p>

                {isLoading && (
                    <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        {t("home.trending_loading")}
                    </div>
                )}

                {!isLoading && trendingHashtags.length === 0 && (
                    <p className="py-3 text-sm text-muted-foreground">
                        {t("home.trending_empty")}
                    </p>
                )}

                {!isLoading && trendingHashtags.length > 0 && (
                    <div className="space-y-1">
                    {trendingHashtags.map((trend, index) => (
                        <button
                            key={trend.hashtag}
                            type="button"
                            onClick={() =>
                                navigate(
                                    `/explore?hashtag=${encodeURIComponent(trend.hashtag)}`,
                                )
                            }
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1a146b]/10 text-xs font-semibold text-[#1a146b]">
                                {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                                    <Hash className="size-3.5 shrink-0" />
                                    {trend.hashtag}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {t("home.trending_posts_24h", { count: trend.postCount })}
                                </span>
                            </span>
                        </button>
                    ))}
                    </div>
                )}
            </section>
        </aside>
    );
}
