import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import {
    fetchGifTrending,
    searchGifs,
    fetchStickerTrending,
    searchStickers,
    fetchGifCategories,
    fetchStickerCategories,
    triggerShare,
    getThumbUrl,
    getDisplayUrl,
    type KlipyItem,
    type KlipyCategory,
} from "@/services/klipy.service";
import { cn } from "@/lib/utils";

type MediaTab = "gif" | "sticker";

interface MediaPickerProps {
    initialTab?: MediaTab;
    customerId: string;
    onSelect: (item: KlipyItem) => void;
    onClose: () => void;
}

export function MediaPicker({
    initialTab = "gif",
    customerId,
    onSelect,
    onClose,
}: MediaPickerProps) {
    const [activeTab, setActiveTab] = useState<MediaTab>(initialTab);
    const [query, setQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [items, setItems] = useState<KlipyItem[]>([]);
    const [categories, setCategories] = useState<KlipyCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const preloadedRef = useRef<Set<number>>(new Set());

    // ── Preload display-quality image on hover ──────────────────────────────
    const handleItemHover = useCallback((item: KlipyItem) => {
        if (preloadedRef.current.has(item.id)) return;
        preloadedRef.current.add(item.id);
        const img = new Image();
        img.src = getDisplayUrl(item);
    }, []);

    // ── Tab switch ──────────────────────────────────────────────────────────
    const switchTab = (tab: MediaTab) => {
        setActiveTab(tab);
        setQuery("");
        setActiveCategory(null);
        setPage(1);
        setItems([]);
        if (searchRef.current) searchRef.current.value = "";
    };

    // ── Categories ──────────────────────────────────────────────────────────
    useEffect(() => {
        (activeTab === "gif" ? fetchGifCategories() : fetchStickerCategories())
            .then(setCategories)
            .catch(() => setCategories([]));
    }, [activeTab]);

    // ── Load items ──────────────────────────────────────────────────────────
    const loadItems = useCallback(
        async (
            currentQuery: string,
            currentCategory: string | null,
            currentPage: number,
            currentTab: MediaTab,
            append = false,
        ) => {
            setLoading(true);
            try {
                const keyword = currentQuery || currentCategory || "";
                let result;
                if (currentTab === "gif") {
                    result = keyword
                        ? await searchGifs(keyword, currentPage, customerId)
                        : await fetchGifTrending(currentPage, customerId);
                } else {
                    result = keyword
                        ? await searchStickers(keyword, currentPage, customerId)
                        : await fetchStickerTrending(currentPage, customerId);
                }
                setItems((prev) =>
                    append ? [...prev, ...result.items] : result.items,
                );
                setHasNext(result.hasNext);
            } catch {
                if (!append) setItems([]);
            } finally {
                setLoading(false);
            }
        },
        [customerId],
    );

    useEffect(() => {
        loadItems(query, activeCategory, 1, activeTab);
        setPage(1);
    }, [activeTab, query, activeCategory, loadItems]);

    // ── Infinite scroll ─────────────────────────────────────────────────────
    const handleGridScroll = useCallback(() => {
        if (!gridRef.current || loading || !hasNext) return;
        const { scrollTop, scrollHeight, clientHeight } = gridRef.current;
        if (scrollHeight - scrollTop - clientHeight < 150) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadItems(query, activeCategory, nextPage, activeTab, true);
        }
    }, [loading, hasNext, page, query, activeCategory, activeTab, loadItems]);

    // ── Search (debounced 400ms) ────────────────────────────────────────────
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setActiveCategory(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const val = e.target.value;
        debounceRef.current = setTimeout(() => setQuery(val), 400);
    };

    // ── Category chip click ─────────────────────────────────────────────────
    const handleCategoryClick = (cat: string) => {
        setActiveCategory((prev) => (prev === cat ? null : cat));
        setQuery("");
        if (searchRef.current) searchRef.current.value = "";
    };

    // ── Item select + share tracking ────────────────────────────────────────
    const handleSelect = useCallback(
        (item: KlipyItem) => {
            triggerShare(activeTab, item.slug, customerId, query);
            onSelect(item);
        },
        [activeTab, customerId, query, onSelect],
    );

    return (
        <div
            className="absolute bottom-14.5 left-0 right-0 h-97.5 bg-background border-t border-border flex flex-col z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-2 duration-200"
            role="dialog"
            aria-label="GIF & Sticker picker"
        >
            {/* ── Header tabs ── */}
            <div className="flex items-center px-3 border-b border-border shrink-0 bg-muted/30">
                <div className="flex flex-1 gap-0.5">
                    <button
                        className={cn(
                            "px-4 py-2.5 border-b-[2.5px] text-[13px] font-semibold tracking-wide transition-colors",
                            activeTab === "gif"
                                ? "text-brand border-brand"
                                : "text-muted-foreground border-transparent hover:text-brand",
                        )}
                        onClick={() => switchTab("gif")}
                    >
                        GIF
                    </button>
                    <button
                        className={cn(
                            "px-4 py-2.5 border-b-[2.5px] text-[13px] font-semibold tracking-wide transition-colors",
                            activeTab === "sticker"
                                ? "text-brand border-brand"
                                : "text-muted-foreground border-transparent hover:text-brand",
                        )}
                        onClick={() => switchTab("sticker")}
                    >
                        Sticker
                    </button>
                </div>
                <button
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors shrink-0"
                    onClick={onClose}
                    aria-label="Đóng"
                >
                    <X size={14} />
                </button>
            </div>

            {/* ── Search ── */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50 shrink-0">
                <Search size={14} className="text-muted-foreground shrink-0" />
                {/* REQUIRED: placeholder must be "Search KLIPY" per KLIPY attribution guidelines */}
                <input
                    ref={searchRef}
                    type="text"
                    className="flex-1 bg-muted rounded-full px-3.5 py-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 placeholder:italic focus:bg-muted-foreground/10 transition-colors"
                    placeholder="Search KLIPY"
                    onChange={handleSearchChange}
                />
            </div>

            {/* ── Category chips (hidden while searching) ── */}
            {categories.length > 0 && !query && (
                <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0 border-b border-border/30 scrollbar-none">
                    {categories.slice(0, 14).map((cat) => (
                        <button
                            key={cat.query}
                            className={cn(
                                "flex flex-col items-center gap-1 px-2 py-1 border-[1.5px] rounded-lg shrink-0 min-w-13 transition-colors text-center",
                                activeCategory === cat.query
                                    ? "border-brand bg-brand/10"
                                    : "border-border bg-background hover:border-brand/50 hover:bg-brand/5",
                            )}
                            onClick={() => handleCategoryClick(cat.query)}
                        >
                            {cat.preview_url && (
                                <img
                                    src={cat.preview_url}
                                    alt=""
                                    className="w-7 h-5 object-cover rounded"
                                />
                            )}
                            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap capitalize">
                                {cat.category}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Content grid ── */}
            <div
                ref={gridRef}
                className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden p-2 grid gap-1 content-start",
                    activeTab === "gif"
                        ? "grid-cols-3 auto-rows-[90px]"
                        : "grid-cols-4 auto-rows-[90px]",
                )}
                onScroll={handleGridScroll}
            >
                {items.map((item) => (
                    <button
                        key={item.id}
                        className={cn(
                            "border-none rounded-lg overflow-hidden cursor-pointer p-0 h-22.5 transition-transform hover:scale-[1.04] hover:shadow-md hover:z-2 active:scale-[0.97]",
                            activeTab === "sticker"
                                ? "bg-transparent flex items-center justify-center p-1"
                                : "bg-muted block relative",
                        )}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => handleItemHover(item)}
                        title={item.title}
                    >
                        <img
                            src={getThumbUrl(item)}
                            alt={item.title}
                            loading="lazy"
                            className={
                                activeTab === "sticker"
                                    ? "max-w-full max-h-full w-auto h-auto object-contain"
                                    : "w-full h-full object-cover block"
                            }
                        />
                    </button>
                ))}

                {loading && (
                    <div className="col-span-full flex justify-center items-center gap-1.5 py-6">
                        <Loader2
                            size={18}
                            className="animate-spin text-brand"
                        />
                        <span className="text-xs text-muted-foreground">
                            Loading...
                        </span>
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="col-span-full flex justify-center items-center py-8">
                        <span className="text-sm text-muted-foreground">
                            No results found
                        </span>
                    </div>
                )}
            </div>

            {/* ── Attribution (REQUIRED) ── */}
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 border-t border-border/30 shrink-0">
                <span className="text-[10px] text-muted-foreground/70">
                    Powered by KLIPY
                </span>
            </div>
        </div>
    );
}
