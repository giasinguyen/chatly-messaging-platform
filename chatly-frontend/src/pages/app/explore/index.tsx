import { Search, Filter, Play } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
    "For You",
    "Trending",
    "Photography",
    "Digital Art",
    "Travel",
    "Architecture",
];

const EXPLORE_ITEMS = [
    {
        id: 1,
        type: "image",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=2070",
        size: "aspect-square",
    },
    {
        id: 2,
        type: "image",
        url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&q=80&w=2070",
        size: "aspect-square",
    },
    {
        id: 3,
        type: "image",
        url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=2080",
        size: "aspect-[2/3]",
        isAlbum: true,
    },
    {
        id: 4,
        type: "image",
        url: "https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&q=80&w=2070",
        size: "aspect-[3/4]",
    },
    {
        id: 5,
        type: "video",
        url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=2071",
        size: "aspect-square",
        isVideo: true,
    },
    {
        id: 6,
        type: "image",
        url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=2071",
        size: "aspect-square",
    },
];

export default function ExplorePage() {
    const [selectedCategory, setSelectedCategory] = useState("For You");

    return (
        <div className="w-full h-full bg-background overflow-y-auto px-6 py-6 hide-scrollbar">
            {/* Search Header */}
            <div className="max-w-5xl mx-auto mb-8 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search explore..."
                        className="pl-10 h-12 bg-muted/50 border-none rounded-2xl text-base focus-visible:ring-1 focus-visible:ring-brand"
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-2xl border-none bg-muted/50"
                >
                    <Filter className="w-5 h-5 text-muted-foreground" />
                </Button>
            </div>

            {/* Categories */}
            <div className="max-w-5xl mx-auto mb-8 flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {CATEGORIES.map((cat) => (
                    <Badge
                        key={cat}
                        variant={
                            selectedCategory === cat ? "default" : "secondary"
                        }
                        className={cn(
                            "px-5 py-2 rounded-xl cursor-pointer text-sm font-medium transition-all",
                            selectedCategory === cat
                                ? "bg-brand text-white shadow-md shadow-brand/20"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat}
                    </Badge>
                ))}
            </div>

            {/* Masonry Grid */}
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                {EXPLORE_ITEMS.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "relative rounded-3xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300",
                            item.size,
                        )}
                    >
                        <img
                            src={item.url}
                            alt="Explore content"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Icons Overlay */}
                        {item.isVideo && (
                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-full p-1.5">
                                <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                        )}
                        {item.isAlbum && (
                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-full p-1.5 flex items-center justify-center">
                                <div className="grid grid-cols-2 gap-0.5">
                                    <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
