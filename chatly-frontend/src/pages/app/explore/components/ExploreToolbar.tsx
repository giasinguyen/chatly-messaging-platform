import { Filter, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXPLORE_CATEGORIES } from "@/constants/explore";
import { cn } from "@/lib/utils";

interface ExploreToolbarProps {
    searchInput: string;
    selectedCategoryId: string;
    selectedHashtag: string | null;
    onSearchChange: (value: string) => void;
    onCategoryClick: (categoryId: string, hashtag: string | null) => void;
}

export function ExploreToolbar({
    searchInput,
    selectedCategoryId,
    selectedHashtag,
    onSearchChange,
    onCategoryClick,
}: ExploreToolbarProps) {
    const { t } = useTranslation();
    const isCustomHashtag =
        selectedHashtag !== null &&
        !EXPLORE_CATEGORIES.some((category) => category.hashtag === selectedHashtag);

    return (
        <>
            <div className="mx-auto mb-8 flex max-w-6xl items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t("explore.search_placeholder")}
                        value={searchInput}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="h-12 rounded-2xl border-none bg-muted/50 pl-10 text-base focus-visible:ring-1 focus-visible:ring-[#1a146b] dark:focus-visible:ring-indigo-400"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-2xl border-none bg-muted/50"
                >
                    <Filter className="size-5 text-muted-foreground" />
                </Button>
            </div>

            <div className="mx-auto mb-8 flex max-w-6xl items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {EXPLORE_CATEGORIES.map((category) => (
                    <Badge
                        key={category.id}
                        variant={
                            selectedCategoryId === category.id
                                ? "default"
                                : "secondary"
                        }
                        className={cn(
                            "cursor-pointer whitespace-nowrap rounded-xl px-5 py-2 text-sm font-medium transition-all",
                            selectedCategoryId === category.id
                                ? "bg-[#312e81] text-[#c3c0ff] shadow-md shadow-[#312e81]/20"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() =>
                            onCategoryClick(category.id, category.hashtag)
                        }
                    >
                        {t(category.labelKey)}
                    </Badge>
                ))}
                {isCustomHashtag && (
                    <Badge
                        variant="default"
                        className="cursor-pointer rounded-xl bg-[#312e81] px-5 py-2 text-sm font-medium text-[#c3c0ff]"
                        onClick={() => onCategoryClick("for_you", selectedHashtag)}
                    >
                        #{selectedHashtag}
                    </Badge>
                )}
            </div>
        </>
    );
}
