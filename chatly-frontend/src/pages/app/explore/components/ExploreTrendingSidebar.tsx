import { Hash, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExploreTrendingSidebarProps {
    hashtags: string[];
    loading: boolean;
    selectedHashtag: string | null;
    onSelect: (hashtag: string) => void;
}

export function ExploreTrendingSidebar({
    hashtags,
    loading,
    selectedHashtag,
    onSelect,
}: ExploreTrendingSidebarProps) {
    return (
        <aside className="hidden h-fit rounded-2xl border border-border bg-card/70 p-4 lg:block">
            <div className="mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-semibold text-foreground">Trending Hashtags</h2>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading trends...
                </div>
            ) : hashtags.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                    Trending topics are not available yet.
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {hashtags.map((hashtag) => (
                        <button
                            key={hashtag}
                            type="button"
                            className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                selectedHashtag === hashtag
                                    ? "border-brand bg-brand/10 text-brand"
                                    : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground",
                            )}
                            onClick={() => onSelect(hashtag)}
                        >
                            #{hashtag}
                        </button>
                    ))}
                </div>
            )}
        </aside>
    );
}
