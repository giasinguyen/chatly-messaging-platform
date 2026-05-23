import { Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXPLORE_CATEGORIES } from "@/constants/explore";
import { cn } from "@/lib/utils";

interface ExploreToolbarProps {
    searchInput: string;
    selectedCategory: string;
    selectedHashtag: string | null;
    onSearchChange: (value: string) => void;
    onCategoryClick: (label: string, hashtag: string | null) => void;
}

export function ExploreToolbar({
    searchInput,
    selectedCategory,
    selectedHashtag,
    onSearchChange,
    onCategoryClick,
}: ExploreToolbarProps) {
    const isCustomHashtag =
        selectedHashtag !== null &&
        !EXPLORE_CATEGORIES.some((category) => category.hashtag === selectedHashtag);

    return (
        <>
            <div className="mx-auto mb-8 flex max-w-6xl items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search explore..."
                        value={searchInput}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="h-12 rounded-2xl border-none bg-muted/50 pl-10 text-base focus-visible:ring-1 focus-visible:ring-brand"
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
                        key={category.label}
                        variant={
                            selectedCategory === category.label
                                ? "default"
                                : "secondary"
                        }
                        className={cn(
                            "cursor-pointer whitespace-nowrap rounded-xl px-5 py-2 text-sm font-medium transition-all",
                            selectedCategory === category.label
                                ? "bg-brand text-white shadow-md shadow-brand/20"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() =>
                            onCategoryClick(category.label, category.hashtag)
                        }
                    >
                        {category.label}
                    </Badge>
                ))}
                {isCustomHashtag && (
                    <Badge
                        variant="default"
                        className="cursor-pointer rounded-xl bg-brand px-5 py-2 text-sm font-medium text-white"
                        onClick={() => onCategoryClick("For You", selectedHashtag)}
                    >
                        #{selectedHashtag}
                    </Badge>
                )}
            </div>
        </>
    );
}
