import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

interface StoryItem {
    id: string;
    label: string;
    initials: string;
    gradient: string;
}

const STORY_ITEMS: StoryItem[] = [
    { id: "story-1", label: "Avery", initials: "A", gradient: "from-rose-500 to-orange-400" },
    { id: "story-2", label: "Jordan", initials: "J", gradient: "from-emerald-500 to-teal-400" },
    { id: "story-3", label: "Morgan", initials: "M", gradient: "from-indigo-500 to-sky-400" },
    { id: "story-4", label: "Riley", initials: "R", gradient: "from-purple-500 to-pink-400" },
    { id: "story-5", label: "Taylor", initials: "T", gradient: "from-amber-500 to-yellow-400" },
];

export function StoryRow() {
    const user = useAuthStore((s) => s.user);
    const userInitial = user?.displayName?.slice(0, 1).toUpperCase() || "Y";

    return (
        <div className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 hide-scrollbar">
            <button
                type="button"
                className="flex flex-col items-center gap-2 shrink-0"
            >
                <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                        {userInitial}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow-md">
                        <Plus className="h-4 w-4" />
                    </span>
                </div>
                <span className="text-xs text-muted-foreground">Your story</span>
            </button>

            {STORY_ITEMS.map((story) => (
                <button
                    key={story.id}
                    type="button"
                    className="flex flex-col items-center gap-2 shrink-0"
                >
                    <div
                        className={cn(
                            "flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white shadow-sm",
                            story.gradient,
                        )}
                    >
                        {story.initials}
                    </div>
                    <span className="text-xs text-muted-foreground">{story.label}</span>
                </button>
            ))}
        </div>
    );
}
